import { NextRequest } from "next/server";
import { getDb, ensureSchema, now } from "@/lib/db";
import { AppError, assertSameOrigin, clientIp, jsonError, jsonOk, readJson } from "@/lib/errors";
import { requireUser } from "@/lib/auth";
import { validateId, normalizeReason } from "@/lib/validation";
import { rateLimitEnabled } from "@/lib/settings";
import { checkRateLimit } from "@/lib/rate-limit";

/** Reports a post to the moderation team. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const user = await requireUser(req);

    if (rateLimitEnabled()) {
      const rl = await checkRateLimit({
        bucket: "report",
        limit: 10,
        windowMs: 60 * 60 * 1000,
        subject: clientIp(req),
      });
      if (!rl.allowed) {
        throw new AppError(429, "You are submitting too many reports. Please wait a while.");
      }
    }

    const { id } = await params;
    const postId = validateId(id);
    const body = await readJson<{ reason?: unknown }>(req);
    const reason = normalizeReason(body.reason);

    const db = getDb();
    await ensureSchema();
    const post = await db
      .prepare("SELECT id, thread_id FROM posts WHERE id = ? AND is_deleted = 0")
      .bind(postId)
      .first<{ id: number; thread_id: number }>();
    if (!post) throw new AppError(404, "Post not found.");

    const already = await db
      .prepare("SELECT id FROM reports WHERE post_id = ? AND reporter_user_id = ? AND status = 'open'")
      .bind(postId, user.id)
      .first();
    if (already) {
      throw new AppError(409, "You have already reported this post.");
    }

    await db
      .prepare(
        "INSERT INTO reports (post_id, thread_id, reporter_user_id, reason, status, created_at) VALUES (?, ?, ?, ?, 'open', ?)"
      )
      .bind(post.id, post.thread_id, user.id, reason, now())
      .run();

    return jsonOk({ reported: true }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}