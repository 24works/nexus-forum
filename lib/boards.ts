import { getDb, ensureSchema, now, row } from "@/lib/db";
import { BoardRow } from "@/lib/types";

/**
 * Recomputes a board's most-recent thread summary from the live data
 * (used after deletions/undeletions to keep the board page accurate).
 */
export async function refreshBoardSummary(boardId: number): Promise<void> {
  await ensureSchema();
  const db = getDb();
  const latest = await row<{
    id: number;
    title: string;
    username: string | null;
    created_at: number;
  }>(
    db,
    `SELECT t.id, t.title, u.username, t.created_at
     FROM threads t LEFT JOIN users u ON u.id = t.last_reply_user_id
     WHERE t.board_id = ? AND t.is_deleted = 0
     ORDER BY COALESCE(t.last_reply_at, t.created_at) DESC
     LIMIT 1`,
    boardId
  );

  const counts = await row<{ threads: number; posts: number }>(
    db,
    `SELECT COUNT(*) AS threads,
            COALESCE(SUM(1 + t.reply_count), 0) AS posts
     FROM threads t WHERE t.board_id = ? AND t.is_deleted = 0`,
    boardId
  );

  await db
    .prepare(
      `UPDATE boards SET
         thread_count = ?,
         post_count = ?,
         last_thread_id = ?,
         last_thread_title = ?,
         last_post_username = ?,
         last_post_created_at = ?
       WHERE id = ?`
    )
    .bind(
      counts?.threads ?? 0,
      counts?.posts ?? 0,
      latest?.id ?? null,
      latest?.title ?? null,
      latest?.username ?? null,
      latest?.created_at ?? null,
      boardId
    )
    .run();
}

export async function getBoard(db: D1Database, boardId: number): Promise<BoardRow | null> {
  const found = await row<BoardRow>(db, "SELECT * FROM boards WHERE id = ?", boardId);
  return found ?? null;
}

export async function getBoardBySlug(db: D1Database, slug: string): Promise<BoardRow | null> {
  const found = await row<BoardRow>(db, "SELECT * FROM boards WHERE slug = ?", slug);
  return found ?? null;
}