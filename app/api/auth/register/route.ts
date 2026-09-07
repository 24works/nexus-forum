import { NextRequest, NextResponse } from "next/server";
import { getDb, ensureSchema, now } from "@/lib/db";
import { AppError, assertSameOrigin, clientIp, jsonError, readJson } from "@/lib/errors";
import { hashPassword, randomToken, sha256Hex } from "@/lib/crypto";
import { createSession, getPepper, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { validateUsername, validatePassword, validateEmail } from "@/lib/validation";
import { allowRegistration, configuredAdminUsernames, bootstrapAdminEnabled, rateLimitEnabled } from "@/lib/settings";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail, emailConfigured, siteUrl } from "@/lib/email";
import { toPublicUser, Role, UserRow } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    if (!allowRegistration()) {
      throw new AppError(403, "Registration is currently closed.");
    }
    if (rateLimitEnabled()) {
      const rl = await checkRateLimit({
        bucket: "register",
        limit: 3,
        windowMs: 60 * 60 * 1000,
        subject: clientIp(req),
      });
      if (!rl.allowed) {
        const mins = Math.ceil(rl.retryAfter / 60);
        throw new AppError(429, `Too many registration attempts. Please try again in about ${mins} minute${mins === 1 ? "" : "s"}.`);
      }
    }

    const body = await readJson<{
      username?: unknown;
      password?: unknown;
      confirmPassword?: unknown;
      email?: unknown;
      company?: unknown; // honeypot
    }>(req);

    if (body.company && String(body.company).length > 0) {
      throw new AppError(400, "Invalid request.");
    }

    const username = validateUsername(body.username);
    const password = validatePassword(body.password, body.confirmPassword);
    const email = validateEmail(body.email);

    const db = getDb();
    await ensureSchema();

    const existingUsername = await db
      .prepare("SELECT id FROM users WHERE username_lower = ?")
      .bind(username.toLowerCase())
      .first();
    if (existingUsername) {
      throw new AppError(409, "That username is already taken.", "username");
    }

    if (email) {
      const existingEmail = await db
        .prepare("SELECT id FROM users WHERE email = ?")
        .bind(email)
        .first();
      if (existingEmail) {
        throw new AppError(409, "An account with that email address already exists.", "email");
      }
    }

    const nowMs = now();
    const passwordHash = await hashPassword(password, getPepper());

    const userCount =
      Number(
        (await db.prepare("SELECT COUNT(*) AS n FROM users").first<{ n: number }>())?.n ?? 0
      );
    const isConfiguredAdmin = configuredAdminUsernames().includes(username.toLowerCase());
    let role: Role = "member";
    if (isConfiguredAdmin) role = "admin";
    else if (bootstrapAdminEnabled() && userCount === 0) role = "admin";

    // Without a configured email provider there is no way to deliver a
    // verification message, so accounts with an email address are verified
    // immediately. Links are never returned in HTTP responses.
    const emailVerified = email && !emailConfigured() ? 1 : 0;

    let result;
    try {
      result = await db
        .prepare(
          `INSERT INTO users (username, username_lower, password_hash, email, email_verified, role, status, created_at, last_seen_at, bio, signature, theme, post_count, thread_count)
           VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, '', '', 'system', 0, 0)`
        )
        .bind(username, username.toLowerCase(), passwordHash, email, emailVerified, role, nowMs, nowMs)
        .run();
    } catch (err) {
      // Two concurrent registrations of the same name/email hit the UNIQUE
      // constraints; report them as friendly conflicts, not 500s.
      const message = err instanceof Error ? err.message : String(err);
      if (/UNIQUE constraint failed: users\.username_lower/i.test(message)) {
        throw new AppError(409, "That username is already taken.", "username");
      }
      if (/UNIQUE constraint failed: users\.email/i.test(message)) {
        throw new AppError(409, "An account with that email address already exists.", "email");
      }
      throw err;
    }
    const userId = Number(result.meta.last_row_id);

    let verificationSent = false;

    if (email && emailConfigured()) {
      const token = randomToken(32);
      const tokenHash = await sha256Hex(token);
      await db
        .prepare(
          "INSERT INTO email_tokens (token_hash, user_id, type, created_at, expires_at, used) VALUES (?, ?, 'verify_email', ?, ?, 0)"
        )
        .bind(tokenHash, userId, nowMs, nowMs + 24 * 60 * 60 * 1000)
        .run();

      const url = `${siteUrl(req)}/verify-email?token=${token}`;
      verificationSent = await sendEmail({
        to: email,
        subject: "Verify your email address",
        text: `Welcome! Please verify your email address by opening this link:\n${url}\n\nIf you did not create this account, you can safely ignore this email.`,
        html: `<p>Welcome!</p><p>Please verify your email address by clicking the link below:</p><p><a href="${url}">${url}</a></p>`,
      });
    }

    const user = await db
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(userId)
      .first<UserRow>();
    if (!user) throw new AppError(500, "Account created but could not be loaded.");

    const sessionToken = await createSession(userId, clientIp(req), req.headers.get("user-agent") ?? undefined);

    const response = NextResponse.json({
      ok: true,
      user: toPublicUser(user),
      verificationSent,
      verificationRequired: false,
    });
    response.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions(req));
    return response;
  } catch (err) {
    return jsonError(err);
  }
}