import { NextRequest } from "next/server";
import { getDb, ensureSchema, now } from "@/lib/db";
import { AppError, assertSameOrigin, jsonError, jsonOk, readJson } from "@/lib/errors";
import { requireUser } from "@/lib/auth";
import { validateContent, validateId } from "@/lib/validation";
import { renderMarkdown } from "@/lib/markdown";
import { canModerate } from "@/lib/auth";
import { getThreadView } from "@/lib/queries";
import { refreshBoardSummary } from "@/lib/boards";
import { audit } from "@/lib/moderation";

const AUTHOR_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const user = await requireUser(req);
    const { id } = await params;
    const postId = validateId(id);

    const body = await readJson<{ content?: unknown }>(req);
    const content = validateContent(body.content);

    const db = getDb();
    await ensureSchema();
    const post = await db.prepare("SELECT * FROM posts WHERE id = ? AND is_deleted = 0").bind(postId).first<{
      id: number;
      thread_id: number;
      user_id: number;
      created_at: number;
    }>();
    if (!post) throw new AppError(404, "Post not found.");

    const isMod = canModerate(user);
    const authorCan = post.user_id === user.id && now() - post.created_at < AUTHOR_EDIT_WINDOW_MS;
    if (!isMod && !authorCan) {
      throw new AppError(403, "This post can no longer be edited.");
    }

    const rendered = renderMarkdown(content);
    await db
      .prepare("UPDATE posts SET content = ?, content_html = ?, updated_at = ?, edit_count = edit_count + 1, edit_user_id = ? WHERE id = ?")
      .bind(content, rendered.html, now(), user.id, postId)
      .run();

    await audit(user, "edit_post", "post", postId);
    return jsonOk({ postId });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const user = await requireUser(req);
    const { id } = await params;
    const postId = validateId(id);

    const db = getDb();
    await ensureSchema();
    const post = await db.prepare("SELECT * FROM posts WHERE id = ? AND is_deleted = 0").bind(postId).first<{
      id: number;
      thread_id: number;
      user_id: number;
      created_at: number;
    }>();
    if (!post) throw new AppError(404, "Post not found.");

    const isMod = canModerate(user);
    const authorCan = post.user_id === user.id && now() - post.created_at < 60 * 60 * 1000;
    if (!isMod && !authorCan) {
      throw new AppError(403, "You can only delete your own post within one hour of posting it.");
    }

    await db.prepare("UPDATE posts SET is_deleted = 1 WHERE id = ?").bind(postId).run();

    const thread = await getThreadView(post.thread_id);
    if (thread) {
      // When the removed post was the thread's latest reply, recompute the
      // denormalized last-reply fields from the newest surviving post.
      if (thread.last_post_id === postId) {
        const newest = await db
          .prepare(
            "SELECT id, user_id, created_at, u.username AS username FROM posts p LEFT JOIN users u ON u.id = p.user_id WHERE p.thread_id = ? AND p.is_deleted = 0 ORDER BY p.created_at DESC, p.id DESC LIMIT 1"
          )
          .bind(post.thread_id)
          .first<{ id: number; user_id: number; created_at: number; username: string | null }>();
        await db
          .prepare(
            `UPDATE threads SET reply_count = MAX(0, reply_count - 1), updated_at = ?,
               last_reply_at = ?, last_reply_user_id = ?, last_reply_username = ?, last_post_id = ?
             WHERE id = ?`
          )
          .bind(
            now(),
            newest?.created_at ?? null,
            newest?.user_id ?? null,
            newest?.username ?? null,
            newest?.id ?? null,
            post.thread_id
          )
          .run();
      } else {
        await db
          .prepare("UPDATE threads SET reply_count = MAX(0, reply_count - 1), updated_at = ? WHERE id = ?")
          .bind(now(), post.thread_id)
          .run();
      }
      await db
        .prepare("UPDATE boards SET post_count = MAX(0, post_count - 1) WHERE id = ?")
        .bind(thread.board_id)
        .run();
      await db.prepare("UPDATE users SET post_count = MAX(0, post_count - 1) WHERE id = ?").bind(post.user_id).run();
      await refreshBoardSummary(thread.board_id);
    }

    await audit(user, "delete_post", "post", postId);
    return jsonOk({ postId });
  } catch (err) {
    return jsonError(err);
  }
}