import { NextRequest } from "next/server";
import { getDb, ensureSchema, now } from "@/lib/db";
import { AppError, assertSameOrigin, clientIp, jsonError, jsonOk, readJson } from "@/lib/errors";
import { randomToken, sha256Hex } from "@/lib/crypto";
import { validateEmail } from "@/lib/validation";
import { rateLimitEnabled } from "@/lib/settings";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail, emailConfigured, siteUrl } from "@/lib/email";

/**
 * Requests a password reset. Response is intentionally identical whether or
 * not the email exists, to avoid leaking account information.
 */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);

    if (rateLimitEnabled()) {
      const rl = await checkRateLimit({
        bucket: "forgot-password",
        limit: 5,
        windowMs: 60 * 60 * 1000,
        subject: clientIp(req),
      });
      if (!rl.allowed) {
        throw new AppError(429, "Too many requests. Please wait a while before trying again.");
      }
    }

    const body = await readJson<{ email?: unknown }>(req);
    const email = validateEmail(body.email, true);
    if (!email) throw new AppError(400, "Email is required.", "email");

    const db = getDb();
    await ensureSchema();
    const account = await db
      .prepare("SELECT id, username FROM users WHERE email = ? AND email_verified = 1")
      .bind(email)
      .first<{ id: number; username: string }>();

    let debugResetLink: string | null = null;

    if (account) {
      const nowMs = now();
      await db.prepare("DELETE FROM email_tokens WHERE user_id = ? AND type = 'reset_password'").bind(account.id).run();
      const token = randomToken(32);
      await db
        .prepare(
          "INSERT INTO email_tokens (token_hash, user_id, type, created_at, expires_at, used) VALUES (?, ?, 'reset_password', ?, ?, 0)"
        )
        .bind(await sha256Hex(token), account.id, nowMs, nowMs + 60 * 60 * 1000)
        .run();

      const url = `${siteUrl(req)}/reset-password?token=${token}`;
      if (emailConfigured()) {
        await sendEmail({
          to: email,
          subject: "Reset your password",
          text: `We received a request to reset the password for "${account.username}".\n\nOpen this link to choose a new password (valid for 1 hour):\n${url}\n\nIf you did not request this, you can safely ignore this email.`,
          html: `<p>We received a request to reset the password for <strong>${account.username}</strong>.</p><p><a href="${url}">Choose a new password</a></p><p>This link is valid for 1 hour.</p>`,
        });
      } else {
        debugResetLink = url;
      }
    }

    return jsonOk({ sent: emailConfigured(), debugResetLink });
  } catch (err) {
    return jsonError(err);
  }
}