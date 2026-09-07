import { NextRequest } from "next/server";
import { getDb, ensureSchema, now } from "@/lib/db";
import { AppError, assertSameOrigin, jsonError, jsonOk, readJson } from "@/lib/errors";
import { requireUser, requireRole } from "@/lib/auth";
import { audit } from "@/lib/moderation";
import { PublicUser } from "@/lib/types";

/** Ban/unban, change role, or verify email of a user. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const actor = requireRole(await requireUser(req), "moderator");
    const { id } = await params;
    const targetId = Number(id);
    if (!Number.isInteger(targetId) || targetId <= 0) throw new AppError(400, "Invalid identifier.");

    const body = await readJson<{
      action?: string;
      reason?: unknown;
      role?: unknown;
    }>(req);
    const action = String(body.action ?? "");

    const db = getDb();
    await ensureSchema();
    const target = await db.prepare("SELECT * FROM users WHERE id = ?").bind(targetId).first<PublicUser & { password_hash: string }>();
    if (!target) throw new AppError(404, "User not found.");

    // Only admins may act on other admins.
    if (target.role === "admin" && actor.role !== "admin") {
      throw new AppError(403, "Only administrators can moderate other administrators.");
    }

    if (action === "ban") {
      const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
      await db.prepare("UPDATE users SET status = 'banned', ban_reason = ? WHERE id = ?").bind(reason || null, targetId).run();
      await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(targetId).run();
      await audit(actor, "ban_user", "user", targetId, reason);
      return jsonOk({ targetId, status: "banned" });
    }

    if (action === "unban") {
      await db.prepare("UPDATE users SET status = 'active', ban_reason = NULL WHERE id = ?").bind(targetId).run();
      await audit(actor, "unban_user", "user", targetId);
      return jsonOk({ targetId, status: "active" });
    }

    if (action === "role") {
      if (actor.role !== "admin") throw new AppError(403, "Only administrators can change roles.");
      const role = String(body.role ?? "");
      if (!["member", "moderator", "admin"].includes(role)) throw new AppError(400, "Invalid role.", "role");
      await db.prepare("UPDATE users SET role = ? WHERE id = ?").bind(role, targetId).run();
      await audit(actor, "set_role", "user", targetId, role);
      return jsonOk({ targetId, role });
    }

    if (action === "verifyEmail") {
      await db.prepare("UPDATE users SET email_verified = 1 WHERE id = ?").bind(targetId).run();
      await audit(actor, "verify_email", "user", targetId);
      return jsonOk({ targetId, email_verified: 1 });
    }

    throw new AppError(400, "Unknown action.");
  } catch (err) {
    return jsonError(err);
  }
}