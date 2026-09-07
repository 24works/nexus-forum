import { NextRequest } from "next/server";
import { getDb, ensureSchema, now } from "@/lib/db";
import { AppError, assertSameOrigin, clientIp, jsonError, jsonOk, readJson } from "@/lib/errors";
import { requireUser } from "@/lib/auth";
import { validateTitle, validateContent, validateTags, validateId } from "@/lib/validation";
import { rateLimitEnabled, itemsPerPage } from "@/lib/settings";
import { checkRateLimit } from "@/lib/rate-limit";
import { renderMarkdown, makeSnippet } from "@/lib/markdown";
import { guardAgainstSpam } from "@/lib/antispam";
import { boardVisibleTo, getBoardRow } from "@/lib/queries";
import { notifyMentions } from "@/lib/notifications";
import { refreshBoardSummary } from "@/lib/boards";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireUser(req);

    if (rateLimitEnabled()) {
      const rl = await checkRateLimit({
        bucket: "create-thread",
        limit: 6,
        windowMs: 60 * 60 * 1000,
        subject: clientIp(req),
      });
      if (!rl.allowed) {
        throw new AppError(429, "You are posting too quickly. Please wait before creating another thread.");
      }
    }

    const body = await readJson<{ boardId?: unknown; title?: unknown; content?: unknown; tags?: unknown }>(req);
    const boardId = validateId(body.boardId);
    const title = validateTitle(body.title);
    const content = validateContent(body.content);
    const tags = validateTags(body.tags);

    await guardAgainstSpam(user, content);

    const db = getDb();
    await ensureSchema();
    const board = await getBoardRow(db, boardId);
    if (!board || !boardVisibleTo(board, user)) {
      throw new AppError(404, "That category does not exist or is not visible to you.");
    }

    const rendered = renderMarkdown(content);
    const nowMs = now();

    const result = await db
      .prepare(
        `INSERT INTO threads (board_id, user_id, title, content, content_html, tags, is_pinned, is_locked, is_announcement, is_deleted, created_at, updated_at, views, reply_count, last_reply_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?, 0, 0, ?)`
      )
      .bind(boardId, user.id, title, content, rendered.html, tags.join(","), nowMs, nowMs, nowMs)
      .run();
    const threadId = Number(result.meta.last_row_id);

    // Increment board counters and make this thread the board's latest.
    await db
      .prepare(
        `UPDATE boards SET thread_count = thread_count + 1, post_count = post_count + 1,
           last_thread_id = ?, last_thread_title = ?, last_post_username = ?, last_post_created_at = ?
         WHERE id = ?`
      )
      .bind(threadId, title, user.username, nowMs, boardId)
      .run();

    await db.prepare("UPDATE users SET thread_count = thread_count + 1, post_count = post_count + 1 WHERE id = ?").bind(user.id).run();

    await notifyMentions({
      content,
      actorUserId: user.id,
      threadId,
      postId: 0,
      actorUsername: user.username,
    });

    return jsonOk(
      {
        threadId,
        url: `/t/${threadId}`,
        snippet: makeSnippet(content),
        perPage: itemsPerPage(),
      },
      { status: 201 }
    );
  } catch (err) {
    return jsonError(err);
  }
}