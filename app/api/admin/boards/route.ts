import { NextRequest } from "next/server";
import { getDb, ensureSchema } from "@/lib/db";
import { AppError, assertSameOrigin, jsonError, jsonOk, readJson } from "@/lib/errors";
import { requireUser, requireRole } from "@/lib/auth";
import { audit } from "@/lib/moderation";

/** Create a category (admin only). */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const admin = requireRole(await requireUser(req), "admin");

    const body = await readJson<{
      name?: unknown;
      slug?: unknown;
      description?: unknown;
      role?: unknown;
      position?: unknown;
    }>(req);

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 60) throw new AppError(400, "Name must be between 2 and 60 characters.", "name");

    const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new AppError(400, "Slug must contain only lowercase letters, numbers and hyphens.", "slug");
    }

    const description = typeof body.description === "string" ? body.description.trim().slice(0, 200) : "";
    const role = ["everyone", "member", "moderator", "admin"].includes(String(body.role)) ? String(body.role) : "everyone";
    const position = Number(body.position);
    const pos = Number.isInteger(position) ? position : 0;

    const db = getDb();
    await ensureSchema();
    const exists = await db.prepare("SELECT id FROM boards WHERE slug = ?").bind(slug).first();
    if (exists) throw new AppError(409, "A category with that slug already exists.", "slug");

    const result = await db
      .prepare(
        "INSERT INTO boards (slug, name, description, role, position, is_enabled, thread_count, post_count) VALUES (?, ?, ?, ?, ?, 1, 0, 0)"
      )
      .bind(slug, name, description, role, pos)
      .run();

    await audit(admin, "create_board", "board", Number(result.meta.last_row_id), slug);
    return jsonOk({ boardId: Number(result.meta.last_row_id) }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}