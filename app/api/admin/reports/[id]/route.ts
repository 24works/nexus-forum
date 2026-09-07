import { NextRequest } from "next/server";
import { getDb, ensureSchema, now } from "@/lib/db";
import { AppError, assertSameOrigin, jsonError, jsonOk, readJson } from "@/lib/errors";
import { requireUser, requireRole } from "@/lib/auth";
import { audit } from "@/lib/moderation";

/** Resolve or dismiss a report (moderator+). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const mod = requireRole(await requireUser(req), "moderator");
    const { id } = await params;
    const reportId = Number(id);
    if (!Number.isInteger(reportId) || reportId <= 0) throw new AppError(400, "Invalid identifier.");

    const body = await readJson<{ action?: string }>(req);
    const action = String(body.action ?? "");

    const db = getDb();
    await ensureSchema();
    const report = await db.prepare("SELECT * FROM reports WHERE id = ?").bind(reportId).first();
    if (!report) throw new AppError(404, "Report not found.");

    if (action === "resolve" || action === "dismiss") {
      const status = action === "resolve" ? "resolved" : "dismissed";
      await db
        .prepare("UPDATE reports SET status = ?, resolved_by = ?, resolved_at = ? WHERE id = ?")
        .bind(status, mod.id, now(), reportId)
        .run();
      await audit(mod, `${status}_report`, "report", reportId);
      return jsonOk({ reportId, status });
    }

    throw new AppError(400, "Unknown action.");
  } catch (err) {
    return jsonError(err);
  }
}