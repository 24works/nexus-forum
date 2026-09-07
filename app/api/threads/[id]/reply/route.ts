import { NextRequest } from "next/server";
import { getDb, ensureSchema, now } from "@/lib/db";
import { AppError, assertSameOrigin, clientIp, jsonError, jsonOk, readJson } from "@/lib/errors";
import { requireUser } from "@/lib/auth";
import { validateContent, validateId } from "@/lib/validation";
import { rateLimitEnabled, itemsPerPage } from "@/lib/settings";
import { checkRateLimit } from "@/lib/rate-limit";
import { renderMarkdown } from "@/lib/markdown";
import { boardVisibleTo, getThreadView } from "@/lib/queries";
import { notifyReply, notifyMentions } from "@/lib/notifications";
import { getBoard } from "@/lib/boards";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const user = await requireUser(req);

    if (rateLimitEnabled()) {
      const rl = await checkRateLimit({
        bucket: "reply",
        limit: 20,
        windowMs: 60 * 60 * 1000,
        subject: clientIp(req),
      });
      if (!rl.allowed) {
        throw new AppError(429, "You are posting too quickly. Please wait a bit before replying again.");
      }
    }

    const { id } = await params;
    const threadId = validateId(id);
    const body = await readJson<{ content?: unknown }>(req);
    const content = validateContent(body.content);

    const db = getDb();
    await ensureSchema();
    const thread = await getThreadView(threadId);
    if (!thread || thread.is_deleted) {
      throw new AppError(404, "Thread not found.");
    }
    const board = await getBoard(db, thread.board_id);
    if (!board || !boardVisibleTo(board, user)) {
      throw new AppError(404, "Thread not found.");
    }
    if (thread.is_locked && !(user.role === "admin" || user.role === "moderator")) {
      throw new AppError(403, "This thread is locked and cannot receive new replies.");
    }

    const rendered = renderMarkdown(content);
    const nowMs = now();
    const perPage = itemsPerPage();

    const result = await db
      .prepare(
        "INSERT INTO posts (thread_id, user_id, content, content_html, is_deleted, created_at, updated_at, edit_count) VALUES (?, ?, ?, ?, 0, ?, NULL, 0)"
      )
      .bind(threadId, user.id, content, rendered.html, nowMs)
      .run();
    const postId = Number(result.meta.last_row_id);

    // The insert and the denormalized counter updates run as one atomic
    // batch, so a failure cannot leave counts out of sync.
    await db
      .batch([
        db
          .prepare(
            `UPDATE threads SET reply_count = reply_count + 1, updated_at = ?,
               last_reply_at = ?, last_reply_user_id = ?, last_reply_username = ?, last_post_id = ?
             WHERE id = ?`
          )
          .bind(nowMs, nowMs, user.id, user.username, postId, threadId),
        db
          .prepare(
            `UPDATE boards SET post_count = post_count + 1,
               last_thread_id = ?, last_thread_title = ?, last_post_username = ?, last_post_created_at = ?
             WHERE id = ?`
          )
          .bind(threadId, thread.title, user.username, nowMs, thread.board_id),
        db.prepare("UPDATE users SET post_count = post_count + 1 WHERE id = ?").bind(user.id),
      ]);

    await notifyReply({
      threadOwnerId: thread.user_id,
      actorUserId: user.id,
      threadId,
      postId,
    });
    await notifyMentions({
      content,
      actorUserId: user.id,
      threadId,
      postId,
      actorUsername: user.username,
    });

    // Page the new reply landed on (reply_count already incremented above).
    const newReplyCount = thread.reply_count + 1;
    return jsonOk(
      {
        postId,
        page: Math.max(1, Math.ceil(newReplyCount / perPage)),
        snippet: rendered.plain.slice(0, 160),
      },
      { status: 201 }
    );
  } catch (err) {
    return jsonError(err);
  }
}

export const dynamic = "force-dynamic";