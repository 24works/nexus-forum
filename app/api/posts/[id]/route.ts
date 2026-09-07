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
    if (thread && thread.reply_count > 0) {
      await db.prepare("UPDATE threads SET reply_count = reply_count - 1, updated_at = ? WHERE id = ?").bind(now(), post.thread_id).run();
      if (thread.last_post_id === postId || thread.last_reply_at === null) {
        await refreshBoardSummary(thread.board_id);
      }
    }
    await db.prepare("UPDATE boards SET post_count = MAX(0, post_count - 1) WHERE id = ?").bind(thread?.board_id ?? -1).run();
    await db.prepare("UPDATE users SET post_count = MAX(0, post_count - 1) WHERE id = ?").bind(post.user_id).run();

    await audit(user, "delete_post", "post", postId);
    return jsonOk({ postId });
  } catch (err) {
    return jsonError(err);
  }
}