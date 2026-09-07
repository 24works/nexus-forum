import { NextRequest } from "next/server";
import { getDb, ensureSchema, now } from "@/lib/db";
import { AppError, assertSameOrigin, jsonError, jsonOk, readJson } from "@/lib/errors";
import { requireUser, getPepper, getUserById } from "@/lib/auth";
import { hashPassword, randomToken, sha256Hex, verifyPassword } from "@/lib/crypto";
import { validateBio, validateSignature, validateEmail, validatePassword } from "@/lib/validation";
import { sendEmail, emailConfigured, siteUrl } from "@/lib/email";
import { toPublicUser, PublicUser, UserRow } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    return jsonOk({ user });
  } catch (err) {
    return jsonError(err);
  }
}

type UpdatePayload = {
  bio?: unknown;
  signature?: unknown;
  theme?: unknown;
  email?: unknown;
  currentPassword?: unknown;
  newPassword?: unknown;
  confirmPassword?: unknown;
};

export async function PATCH(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const session = await requireUser(req);
    const body = await readJson<UpdatePayload>(req);

    const db = getDb();
    await ensureSchema();
    const user = await getUserById(db, session.id);
    if (!user) throw new AppError(404, "Account not found.");

    let updates: string[] = [];
    const params: unknown[] = [];

    if (body.bio !== undefined) {
      updates.push("bio = ?");
      params.push(validateBio(body.bio));
    }
    if (body.signature !== undefined) {
      updates.push("signature = ?");
      params.push(validateSignature(body.signature));
    }
    if (body.theme !== undefined) {
      const theme = String(body.theme);
      if (!["system", "light", "dark"].includes(theme)) {
        throw new AppError(400, "Invalid theme.", "theme");
      }
      updates.push("theme = ?");
      params.push(theme);
    }

    let email = user.email;
    let debugVerificationLink: string | null = null;

    if (body.email !== undefined) {
      const newEmail = validateEmail(body.email);
      if (newEmail !== null && newEmail !== (user.email ?? "").toLowerCase()) {
        const taken = await db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").bind(newEmail, user.id).first();
        if (taken) throw new AppError(409, "That email address is already in use.", "email");
        updates.push("email = ?");
        updates.push("email_verified = 0");
        params.push(newEmail);

        const nowMs = now();
        const token = randomToken(32);
        await db
          .prepare(
            "INSERT INTO email_tokens (token_hash, user_id, type, created_at, expires_at, used) VALUES (?, ?, 'verify_email', ?, ?, 0)"
          )
          .bind(await sha256Hex(token), user.id, nowMs, nowMs + 24 * 60 * 60 * 1000)
          .run();
        const url = `${siteUrl(req)}/verify-email?token=${token}`;
        if (emailConfigured()) {
          await sendEmail({
            to: newEmail,
            subject: "Verify your email address",
            text: `Please verify your email address by opening this link:\n${url}`,
            html: `<p>Please verify your email address by clicking <a href="${url}">this link</a>.</p>`,
          });
        } else {
          debugVerificationLink = url;
        }
        email = newEmail;
      } else if (newEmail === null) {
        updates.push("email = NULL");
        updates.push("email_verified = 0");
        email = null;
      }
    }

    let passwordChanged = false;
    if (body.newPassword !== undefined && String(body.newPassword).length > 0) {
      if (typeof body.currentPassword !== "string" || body.currentPassword.length === 0) {
        throw new AppError(400, "Please enter your current password.", "currentPassword");
      }
      const valid = await verifyPassword(body.currentPassword, user.password_hash, getPepper());
      if (!valid) {
        throw new AppError(400, "Current password is incorrect.", "currentPassword");
      }
      validatePassword(body.newPassword, body.confirmPassword);
      updates.push("password_hash = ?");
      params.push(await hashPassword(String(body.newPassword), getPepper()));
      passwordChanged = true;
    }

    if (updates.length > 0) {
      const statement = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;
      await db.prepare(statement).bind(...params, user.id).run();
    }

    if (passwordChanged) {
      // Invalidate other sessions.
      await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id).run();
    }

    const updated = await db.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first<UserRow>();
    if (!updated) throw new AppError(500, "Could not reload your profile.");
    const pub: PublicUser = toPublicUser(updated);

    return jsonOk({
      user: { ...pub, email: updated.email ?? "", email_verified: updated.email_verified ?? 0 },
      debugVerificationLink,
    });
  } catch (err) {
    return jsonError(err);
  }
}