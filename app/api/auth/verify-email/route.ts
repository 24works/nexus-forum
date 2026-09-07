import { NextRequest } from "next/server";
import { getDb, ensureSchema, now } from "@/lib/db";
import { AppError, assertSameOrigin, jsonError, jsonOk, readJson } from "@/lib/errors";
import { sha256Hex } from "@/lib/crypto";
import { requireUser } from "@/lib/auth";
import { toPublicUser, UserRow } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireUser(req);
    const body = await readJson<{ token?: unknown }>(req);
    const token = typeof body.token === "string" && body.token.length > 0 ? body.token : null;
    if (!token) throw new AppError(400, "Verification token is required.", "token");

    const db = getDb();
    await ensureSchema();
    const tokenHash = await sha256Hex(token);
    const found = await db
      .prepare(
        "SELECT * FROM email_tokens WHERE token_hash = ? AND type = 'verify_email' AND used = 0"
      )
      .bind(tokenHash)
      .first<{ id: number; user_id: number; expires_at: number }>();

    if (!found || found.user_id !== user.id) {
      throw new AppError(400, "This verification link is invalid or has already been used.", "token");
    }
    if (found.expires_at <= now()) {
      throw new AppError(400, "This verification link has expired. Request a new one.", "token");
    }

    await db.batch([
      db.prepare("UPDATE email_tokens SET used = 1 WHERE token_hash = ?").bind(tokenHash),
      db.prepare("UPDATE users SET email_verified = 1 WHERE id = ?").bind(user.id),
    ]);

    // Return the freshly updated user so the client sees email_verified = 1.
    const updated = await db.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first<UserRow>();
    return jsonOk({ user: updated ? toPublicUser(updated) : user });
  } catch (err) {
    return jsonError(err);
  }
}