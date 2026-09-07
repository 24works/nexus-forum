import { NextRequest, NextResponse } from "next/server";
import { getDb, ensureSchema, now } from "@/lib/db";
import { AppError, assertSameOrigin, clientIp, jsonError, readJson } from "@/lib/errors";
import { hashPassword, sha256Hex } from "@/lib/crypto";
import { createSession, getPepper, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { validatePassword } from "@/lib/validation";
import { toPublicUser, UserRow } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);

    const body = await readJson<{ token?: unknown; password?: unknown; confirmPassword?: unknown }>(req);
    const token = typeof body.token === "string" && body.token.length > 0 ? body.token : null;
    if (!token) throw new AppError(400, "Reset token is required.", "token");
    validatePassword(body.password, body.confirmPassword);
    const password = body.password as string;

    const db = getDb();
    await ensureSchema();
    const tokenHash = await sha256Hex(token);
    const found = await db
      .prepare("SELECT * FROM email_tokens WHERE token_hash = ? AND type = 'reset_password' AND used = 0")
      .bind(tokenHash)
      .first<{ user_id: number; expires_at: number }>();

    if (!found) throw new AppError(400, "This reset link is invalid or has already been used.", "token");
    if (found.expires_at <= now()) throw new AppError(400, "This reset link has expired.", "token");

    const passwordHash = await hashPassword(password, getPepper());

    await db.batch([
      db.prepare("UPDATE users SET password_hash = ?, last_seen_at = ? WHERE id = ?").bind(passwordHash, now(), found.user_id),
      db.prepare("UPDATE email_tokens SET used = 1 WHERE token_hash = ?").bind(tokenHash),
      db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(found.user_id),
    ]);

    const user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(found.user_id).first<UserRow>();
    if (!user) throw new AppError(500, "Could not load account after resetting password.");

    // Log the user in with a fresh session.
    const sessionToken = await createSession(user.id, clientIp(req), req.headers.get("user-agent") ?? undefined);
    const response = NextResponse.json({ ok: true, user: toPublicUser(user) });
    response.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions(req));
    return response;
  } catch (err) {
    return jsonError(err);
  }
}