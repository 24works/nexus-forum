import { getDb, ensureSchema, now, all } from "@/lib/db";
import { extractMentions } from "@/lib/markdown";
import { NotificationRow } from "@/lib/types";

/** Records a notification that a user's thread received a reply. */
export async function notifyReply(opts: {
  threadOwnerId: number;
  actorUserId: number;
  threadId: number;
  postId: number;
}): Promise<void> {
  if (opts.threadOwnerId === opts.actorUserId) return;
  const db = getDb();
  const exists = await db
    .prepare("SELECT id FROM notifications WHERE user_id = ? AND type = 'reply' AND thread_id = ? AND actor_user_id = ? AND read = 0")
    .bind(opts.threadOwnerId, opts.threadId, opts.actorUserId)
    .first();
  if (!exists) {
    await db
      .prepare(
        "INSERT INTO notifications (user_id, type, thread_id, post_id, actor_user_id, read, created_at) VALUES (?, 'reply', ?, ?, ?, 0, ?)"
      )
      .bind(opts.threadOwnerId, opts.threadId, opts.postId, opts.actorUserId, now())
      .run();
  }
}

/** Creates mention notifications for @username references in content. */
export async function notifyMentions(opts: {
  content: string;
  actorUserId: number;
  threadId: number;
  postId: number;
  actorUsername: string;
}): Promise<void> {
  const names = extractMentions(opts.content);
  if (names.length === 0) return;
  const db = getDb();
  const placeholders = names.map(() => "?").join(",");
  const users = await all<{ id: number; username: string }>(
    db,
    `SELECT id, username FROM users WHERE username_lower IN (${placeholders}) AND status = 'active'`,
    ...names
  );
  if (users.length === 0) return;

  const statements = users
    .filter((u) => u.id !== opts.actorUserId)
    .map((u) => ({
      sql:
        "INSERT OR IGNORE INTO notifications (user_id, type, thread_id, post_id, actor_user_id, read, created_at) VALUES (?, 'mention', ?, ?, ?, 0, ?)",
      params: [u.id, opts.threadId, opts.postId, opts.actorUserId, now()],
    }));

  if (statements.length > 0) {
    await db.batch(statements.map((s) => db.prepare(s.sql).bind(...(s.params as unknown[]))));
  }
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  await ensureSchema();
  const found = await getDb()
    .prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0")
    .bind(userId)
    .first<{ n: number }>();
  return found?.n ?? 0;
}