import { NextRequest } from "next/server";
import { getDb, ensureSchema } from "@/lib/db";
import { AppError, assertSameOrigin, jsonError, jsonOk, readJson } from "@/lib/errors";
import { requireUser, requireRole } from "@/lib/auth";
import { audit } from "@/lib/moderation";

/** Update or disable a category (admin only). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const admin = requireRole(await requireUser(req), "admin");
    const { id } = await params;
    const boardId = Number(id);
    if (!Number.isInteger(boardId) || boardId <= 0) throw new AppError(400, "Invalid identifier.");

    const body = await readJson<{
      name?: unknown;
      description?: unknown;
      role?: unknown;
      position?: unknown;
      is_enabled?: unknown;
    }>(req);

    const db = getDb();
    await ensureSchema();
    const board = await db.prepare("SELECT * FROM boards WHERE id = ?").bind(boardId).first();
    if (!board) throw new AppError(404, "Category not found.");

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2 || name.length > 60) throw new AppError(400, "Name must be between 2 and 60 characters.", "name");
      updates.push("name = ?");
      values.push(name);
    }
    if (body.description !== undefined) {
      updates.push("description = ?");
      values.push(String(body.description).trim().slice(0, 200));
    }
    if (body.role !== undefined) {
      const role = String(body.role);
      if (!["everyone", "member", "moderator", "admin"].includes(role)) {
        throw new AppError(400, "Invalid visibility role.", "role");
      }
      updates.push("role = ?");
      values.push(role);
    }
    if (body.position !== undefined) {
      const pos = Number(body.position);
      if (Number.isInteger(pos)) {
        updates.push("position = ?");
        values.push(pos);
      }
    }
    if (body.is_enabled !== undefined) {
      updates.push("is_enabled = ?");
      values.push(body.is_enabled ? 1 : 0);
    }

    if (updates.length > 0) {
      await db.prepare(`UPDATE boards SET ${updates.join(", ")} WHERE id = ?`).bind(...values, boardId).run();
    }

    await audit(admin, "update_board", "board", boardId);
    return jsonOk({ boardId });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const admin = requireRole(await requireUser(req), "admin");
    const { id } = await params;
    const boardId = Number(id);
    if (!Number.isInteger(boardId) || boardId <= 0) throw new AppError(400, "Invalid identifier.");

    const db = getDb();
    await ensureSchema();
    await db.prepare("UPDATE boards SET is_enabled = 0 WHERE id = ?").bind(boardId).run();
    await audit(admin, "disable_board", "board", boardId);
    return jsonOk({ boardId });
  } catch (err) {
    return jsonError(err);
  }
}