import { NextRequest } from "next/server";
import { getDb, ensureSchema, now } from "@/lib/db";
import { AppError, assertSameOrigin, clientIp, jsonError, jsonOk, readJson } from "@/lib/errors";
import { randomToken, sha256Hex } from "@/lib/crypto";
import { requireUser } from "@/lib/auth";
import { validateEmail } from "@/lib/validation";
import { rateLimitEnabled } from "@/lib/settings";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail, emailConfigured, siteUrl } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireUser(req);

    if (user.email_verified) {
      throw new AppError(400, "Your email address is already verified.");
    }

    const body = await readJson<{ email?: unknown }>(req);
    const email = validateEmail(body.email, true);
    if (!email) throw new AppError(400, "Email is required.", "email");

    if (rateLimitEnabled()) {
      const rl = await checkRateLimit({
        bucket: "resend-verification",
        limit: 5,
        windowMs: 60 * 60 * 1000,
        subject: clientIp(req),
      });
      if (!rl.allowed) {
        throw new AppError(429, "Too many resend attempts. Please wait a while before trying again.");
      }
    }

    const db = getDb();
    await ensureSchema();

    // Only allow sending to the address currently on the account profile.
    if ((user.email ?? "").toLowerCase() !== email.toLowerCase()) {
      await db.prepare("UPDATE users SET email = ? WHERE id = ?").bind(email, user.id).run();
    }

    const nowMs = now();
    void (await db.prepare("DELETE FROM email_tokens WHERE user_id = ? AND type = 'verify_email'").bind(user.id).run());
    const token = randomToken(32);
    await db
      .prepare(
        "INSERT INTO email_tokens (token_hash, user_id, type, created_at, expires_at, used) VALUES (?, ?, 'verify_email', ?, ?, 0)"
      )
      .bind(await sha256Hex(token), user.id, nowMs, nowMs + 24 * 60 * 60 * 1000)
      .run();

    const url = `${siteUrl(req)}/verify-email?token=${token}`;
    let sent = false;
    let debugVerificationLink: string | null = null;
    if (emailConfigured()) {
      sent = await sendEmail({
        to: email,
        subject: "Verify your email address",
        text: `Please verify your email address by opening this link:\n${url}`,
        html: `<p>Please verify your email address by clicking <a href="${url}">this link</a>.</p>`,
      });
    } else {
      debugVerificationLink = url;
    }

    return jsonOk({ sent, debugVerificationLink });
  } catch (err) {
    return jsonError(err);
  }
}