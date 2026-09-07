import { NextRequest } from "next/server";
import { getDb, ensureSchema, now } from "@/lib/db";
import { AppError, assertSameOrigin, jsonError, jsonOk, readJson } from "@/lib/errors";
import { requireUser } from "@/lib/auth";
import { validateTitle, validateContent, validateTags, validateId } from "@/lib/validation";
import { renderMarkdown } from "@/lib/markdown";
import { canModerate } from "@/lib/auth";
import { boardVisibleTo, getBoardRow, getThreadView } from "@/lib/queries";
import { refreshBoardSummary } from "@/lib/boards";
import { audit } from "@/lib/moderation";

const AUTHOR_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const user = await requireUser(req);
    const { id } = await params;
    const threadId = validateId(id);

    const body = await readJson<{
      action?: string;
      title?: unknown;
      content?: unknown;
      tags?: unknown;
      boardId?: unknown;
    }>(req);
    const action = typeof body.action === "string" ? body.action : "edit";

    const db = getDb();
    await ensureSchema();
    const thread = await getThreadView(threadId);
    if (!thread || thread.is_deleted) throw new AppError(404, "Thread not found.");

    const isMod = canModerate(user);
    const authorCanEdit =
      thread.user_id === user.id && (now() - thread.created_at < AUTHOR_EDIT_WINDOW_MS || thread.reply_count === 0);

    if (action === "edit") {
      if (!authorCanEdit && !isMod) {
        throw new AppError(403, "This thread can no longer be edited. Contact a moderator if you need changes.");
      }
      let title = thread.title;
      let content = thread.content;
      let tags = thread.tags;
      if (body.title !== undefined) title = validateTitle(body.title);
      if (body.content !== undefined) {
        content = validateContent(body.content);
      }
      if (body.tags !== undefined) tags = validateTags(body.tags).join(",");

      const rendered = renderMarkdown(content);
      await db
        .prepare(
          "UPDATE threads SET title = ?, content = ?, content_html = ?, tags = ?, updated_at = ? WHERE id = ?"
        )
        .bind(title, content, rendered.html, tags, now(), threadId)
        .run();
      await audit(user, "edit_thread", "thread", threadId, `"${title}"`);
      return jsonOk({ threadId });
    }

    if (action === "pin") {
      if (!isMod) throw new AppError(403, "Only moderators can pin threads.");
      await db.prepare("UPDATE threads SET is_pinned = ? WHERE id = ?").bind(thread.is_pinned ? 0 : 1, threadId).run();
      await audit(user, thread.is_pinned ? "unpin_thread" : "pin_thread", "thread", threadId, `"${thread.title}"`);
      return jsonOk({ threadId, is_pinned: !thread.is_pinned });
    }

    if (action === "announce") {
      if (!isMod) throw new AppError(403, "Only moderators can mark announcements.");
      await db.prepare("UPDATE threads SET is_announcement = ? WHERE id = ?").bind(thread.is_announcement ? 0 : 1, threadId).run();
      await audit(user, thread.is_announcement ? "unannounce_thread" : "announce_thread", "thread", threadId, `"${thread.title}"`);
      return jsonOk({ threadId, is_announcement: !thread.is_announcement });
    }

    if (action === "lock") {
      if (!isMod) throw new AppError(403, "Only moderators can lock threads.");
      await db.prepare("UPDATE threads SET is_locked = ? WHERE id = ?").bind(thread.is_locked ? 0 : 1, threadId).run();
      await audit(user, thread.is_locked ? "unlock_thread" : "lock_thread", "thread", threadId, `"${thread.title}"`);
      return jsonOk({ threadId, is_locked: !thread.is_locked });
    }

    if (action === "delete" || action === "undelete") {
      const hide = action === "delete";
      if (!hide && !isMod) throw new AppError(403, "Only moderators can restore threads.");
      if (hide && !isMod && !(thread.user_id === user.id && now() - thread.created_at < 60 * 60 * 1000)) {
        throw new AppError(403, "You can only delete your own thread within one hour of posting it.");
      }
      await db.prepare("UPDATE threads SET is_deleted = ? WHERE id = ?").bind(hide ? 1 : 0, threadId).run();
      await refreshBoardSummary(thread.board_id);
      await audit(user, hide ? "delete_thread" : "undelete_thread", "thread", threadId, `"${thread.title}"`);
      return jsonOk({ threadId, is_deleted: hide });
    }

    if (action === "move") {
      if (!isMod) throw new AppError(403, "Only moderators can move threads.");
      const targetBoardId = validateId(body.boardId);
      const targetBoard = await getBoardRow(db, targetBoardId);
      if (!targetBoard || !boardVisibleTo(targetBoard, user)) {
        throw new AppError(400, "Target category does not exist.");
      }
      await db.prepare("UPDATE threads SET board_id = ?, updated_at = ? WHERE id = ?").bind(targetBoardId, now(), threadId).run();
      await refreshBoardSummary(thread.board_id);
      await refreshBoardSummary(targetBoardId);
      await audit(user, "move_thread", "thread", threadId, `"${thread.title}" -> ${targetBoard.slug}`);
      return jsonOk({ threadId });
    }

    throw new AppError(400, "Unknown action.");
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const user = await requireUser(req);
    const { id } = await params;
    const threadId = validateId(id);

    const db = getDb();
    await ensureSchema();
    const thread = await getThreadView(threadId);
    if (!thread || thread.is_deleted) throw new AppError(404, "Thread not found.");

    const isMod = canModerate(user);
    const authorCan = thread.user_id === user.id && now() - thread.created_at < 60 * 60 * 1000;
    if (!isMod && !authorCan) {
      throw new AppError(403, "You can only delete your own thread within one hour of posting it.");
    }

    await db.prepare("UPDATE threads SET is_deleted = 1 WHERE id = ?").bind(threadId).run();
    await refreshBoardSummary(thread.board_id);
    await audit(user, "delete_thread", "thread", threadId, `"${thread.title}"`);
    return jsonOk({ threadId });
  } catch (err) {
    return jsonError(err);
  }
}