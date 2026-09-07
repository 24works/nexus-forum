import { getDb, ensureSchema, now, all, row, withPagination, Paged, scalar } from "@/lib/db";
import {
  BoardRow,
  NotificationRow,
  PostRow,
  PublicUser,
  ReportRow,
  AuditRow,
  SiteStats,
  ThreadRow,
  UserRow,
  toPublicUser,
} from "@/lib/types";

export interface ThreadView extends ThreadRow {
  author_username?: string;
  board_slug?: string;
  board_name?: string;
}

export interface PostView extends PostRow {
  author_username?: string;
  author_post_count?: number;
  thread_title?: string;
  thread_slug?: string;
}

export interface NotificationView extends NotificationRow {
  actor_username?: string | null;
  thread_title?: string | null;
}

const THREAD_SELECT = `
  SELECT t.*, u.username AS author_username, b.slug AS board_slug, b.name AS board_name
  FROM threads t
  JOIN users u ON u.id = t.user_id
  JOIN boards b ON b.id = t.board_id
`;

// ---------------------------------------------------------------------------
// Boards
// ---------------------------------------------------------------------------

export async function listBoards(userRole: PublicUser | null): Promise<BoardRow[]> {
  await ensureSchema();
  const db = getDb();
  const { results } = await db.prepare("SELECT * FROM boards ORDER BY position ASC, id ASC").all<BoardRow>();
  const role = userRole?.role ?? "member";
  return results.filter((b) => {
    if (b.is_enabled === 0 && role !== "admin") return false;
    if (b.role === "admin") return role === "admin";
    if (b.role === "moderator") return role === "admin" || role === "moderator";
    return true;
  });
}

export async function getBoardRow(db: D1Database, id: number): Promise<BoardRow | null> {
  const found = await row<BoardRow>(db, "SELECT * FROM boards WHERE id = ?", id);
  return found ?? null;
}

export async function getBoardBySlugRow(db: D1Database, slug: string): Promise<BoardRow | null> {
  const found = await row<BoardRow>(db, "SELECT * FROM boards WHERE slug = ?", slug);
  return found ?? null;
}

export function boardVisibleTo(board: BoardRow, user: PublicUser | null): boolean {
  const role = user?.role ?? "member";
  if (board.is_enabled === 0 && role !== "admin") return false;
  if (board.role === "admin") return role === "admin";
  if (board.role === "moderator") return role === "admin" || role === "moderator";
  return true;
}

// ---------------------------------------------------------------------------
// Threads
// ---------------------------------------------------------------------------

export type ThreadSort = "latest" | "newest" | "hot" | "oldest" | "views";

const SORT_CLAUSES: Record<ThreadSort, string> = {
  latest: "t.is_announcement DESC, t.is_pinned DESC, COALESCE(t.last_reply_at, t.created_at) DESC, t.id DESC",
  newest: "t.is_announcement DESC, t.is_pinned DESC, t.created_at DESC, t.id DESC",
  hot: "COALESCE(t.last_reply_at, t.created_at) > ?, (t.views + t.reply_count * 5) DESC, t.id DESC",
  oldest: "t.created_at ASC, t.id ASC",
  views: "t.is_announcement DESC, t.is_pinned DESC, t.views DESC, t.id DESC",
};

export function sortClause(sort: ThreadSort, db: D1Database, boardId: number) {
  // hot needs a recency bound
  return SORT_CLAUSES[sort];
}

export async function boardThreads(
  boardId: number,
  page: number,
  perPage: number,
  sort: ThreadSort
): Promise<Paged<ThreadView>> {
  await ensureSchema();
  const db = getDb();
  const orderBy = SORT_CLAUSES[sort] ?? SORT_CLAUSES.latest;
  const hotBoundary = now() - 30 * 24 * 60 * 60 * 1000;

  const countParams: unknown[] = [boardId];
  const rowsParams: unknown[] = [boardId];
  if (sort === "hot") rowsParams.push(hotBoundary);

  const countSql = "SELECT COUNT(*) AS n FROM threads t WHERE t.board_id = ? AND t.is_deleted = 0";
  const rowsSql = `${THREAD_SELECT} WHERE t.board_id = ? AND t.is_deleted = 0 ORDER BY ${orderBy} LIMIT ? OFFSET ?`;

  const countRow = await db.prepare(countSql).bind(...countParams).first<{ n: number }>();
  const total = Number(countRow?.n ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * perPage;

  const { results } = await db.prepare(rowsSql).bind(...rowsParams, perPage, offset).all<ThreadView>();
  return { items: results, total, page: safePage, perPage, totalPages };
}

export async function getThreadView(threadId: number): Promise<ThreadView | null> {
  await ensureSchema();
  const found = await row<ThreadView>(getDb(), `${THREAD_SELECT} WHERE t.id = ?`, threadId);
  return found ?? null;
}

export async function incrementThreadViews(threadId: number): Promise<void> {
  const db = getDb();
  await db.prepare("UPDATE threads SET views = views + 1 WHERE id = ?").bind(threadId).run();
}

export async function threadPosts(
  threadId: number,
  page: number,
  perPage: number
): Promise<Paged<PostView>> {
  await ensureSchema();
  const db = getDb();
  const countSql = "SELECT COUNT(*) AS n FROM posts WHERE thread_id = ?";
  const rowsSql = `
    SELECT p.*, u.username AS author_username, u.role AS author_role, u.bio AS author_bio,
           u.post_count AS author_post_count,
           ti.title AS thread_title
    FROM posts p
    LEFT JOIN users u ON u.id = p.user_id
    JOIN threads ti ON ti.id = p.thread_id
    WHERE p.thread_id = ?
    ORDER BY p.created_at ASC, p.id ASC
    LIMIT ? OFFSET ?
  `;
  const countRow = await db.prepare(countSql).bind(threadId).first<{ n: number }>();
  const total = Number(countRow?.n ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * perPage;
  const { results } = await db.prepare(rowsSql).bind(threadId, perPage, offset).all();
  return { items: results as unknown as PostView[], total, page: safePage, perPage, totalPages };
}

export async function latestThreads(limit = 10): Promise<ThreadView[]> {
  await ensureSchema();
  const db = getDb();
  const { results } = await db
    .prepare(`
      ${THREAD_SELECT}
      WHERE t.is_deleted = 0 AND b.is_enabled = 1
      ORDER BY COALESCE(t.last_reply_at, t.created_at) DESC
      LIMIT ?
    `)
    .bind(limit)
    .all<ThreadView>();
  return results;
}

// ---------------------------------------------------------------------------
// Users / profiles
// ---------------------------------------------------------------------------

export async function publicUserByUsername(username: string): Promise<PublicUser | null> {
  await ensureSchema();
  const found = await row<UserRow>(
    getDb(),
    "SELECT * FROM users WHERE username_lower = ?",
    username.trim().toLowerCase()
  );
  return found ? toPublicUser(found) : null;
}

export async function publicUserById(id: number): Promise<PublicUser | null> {
  await ensureSchema();
  const found = await row<UserRow>(getDb(), "SELECT * FROM users WHERE id = ?", id);
  return found ? toPublicUser(found) : null;
}

export interface UserThreadWithView extends ThreadView {}

export async function userThreads(userId: number, page: number, perPage: number): Promise<Paged<UserThreadWithView>> {
  await ensureSchema();
  const db = getDb();
  const countSql = "SELECT COUNT(*) AS n FROM threads WHERE user_id = ? AND is_deleted = 0";
  const rowsSql = `${THREAD_SELECT} WHERE t.user_id = ? AND t.is_deleted = 0 ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
  const countRow = await db.prepare(countSql).bind(userId).first<{ n: number }>();
  const total = Number(countRow?.n ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * perPage;
  const { results } = await db.prepare(rowsSql).bind(userId, perPage, offset).all<UserThreadWithView>();
  return { items: results, total, page: safePage, perPage, totalPages };
}

export async function userPosts(userId: number, page: number, perPage: number): Promise<Paged<PostView>> {
  await ensureSchema();
  const db = getDb();
  const countSql = "SELECT COUNT(*) AS n FROM posts WHERE user_id = ? AND is_deleted = 0";
  const rowsSql = `
    SELECT p.*, u.username AS author_username, t.title AS thread_title, t.id AS thread_id
    FROM posts p
    LEFT JOIN users u ON u.id = p.user_id
    JOIN threads t ON t.id = p.thread_id
    WHERE p.user_id = ? AND p.is_deleted = 0 AND t.is_deleted = 0
    ORDER BY p.created_at DESC LIMIT ? OFFSET ?
  `;
  const countRow = await db.prepare(countSql).bind(userId).first<{ n: number }>();
  const total = Number(countRow?.n ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * perPage;
  const { results } = await db.prepare(rowsSql).bind(userId, perPage, offset).all();
  return { items: results as unknown as PostView[], total, page: safePage, perPage, totalPages };
}

export async function userPostsCount(userId: number): Promise<number> {
  const n = await scalar<number>(getDb(), "SELECT COUNT(*) FROM posts WHERE user_id = ? AND is_deleted = 0", userId);
  return n ?? 0;
}

/** Raw post content for quoting (reads even soft-deleted posts are excluded). */
export async function getThreadPostsForQuote(postId: number): Promise<string | null> {
  await ensureSchema();
  const post = await row<{ content: string }>(
    getDb(),
    "SELECT content FROM posts WHERE id = ? AND is_deleted = 0",
    postId
  );
  return post?.content ?? null;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

function sanitizeFtsQuery(query: string): string {
  return query
    .replace(/[^\p{L}\p{N}_-]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => (tok.length > 1 ? `"${tok.replace(/"/g, "")}"` : tok))
    .join(" AND ")
    .slice(0, 200);
}

function escapeLike(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export interface SearchResult {
  threadId: number;
  threadTitle: string;
  createdAt: number;
  authorUsername: string | null;
  boardSlug: string;
  boardName: string;
  replyCount: number;
  snippet: string | null;
  type: "thread" | "post";
  postId?: number;
}

export async function searchForum(opts: {
  query: string;
  boardId?: number;
  page: number;
  perPage: number;
}): Promise<Paged<SearchResult>> {
  await ensureSchema();
  const db = getDb();
  const q = opts.query.trim().slice(0, 100);
  const results = await searchThreadsViaFts(db, q, opts.boardId, opts.perPage);
  if (results.length > 0) {
    const total = await ftsThreadCount(db, q, opts.boardId);
    return { items: results, total, page: opts.page, perPage: opts.perPage, totalPages: Math.max(1, Math.ceil(total / opts.perPage)) };
  }
  return searchViaLike(db, q, opts.boardId, opts.page, opts.perPage);
}

async function ftsThreadRows(db: D1Database, q: string, boardId: number | undefined, limit: number): Promise<SearchResult[]> {
  const ftsq = sanitizeFtsQuery(q);
  const boardClause = boardId ? "AND t.board_id = ?" : "";
  const params: unknown[] = [ftsq];
  if (boardId) params.push(boardId);
  params.push(limit);

  const { results } = await db
    .prepare(
      `SELECT t.id AS threadId, t.title AS threadTitle, t.created_at AS createdAt,
              u.username AS authorUsername, b.slug AS boardSlug, b.name AS boardName,
              t.reply_count AS replyCount,
              snippet(threads_fts, 1, '<mark>', '</mark>', '…', 14) AS snippet
       FROM threads_fts
       JOIN threads t ON t.id = threads_fts.rowid
       JOIN users u ON u.id = t.user_id
       JOIN boards b ON b.id = t.board_id
       WHERE threads_fts MATCH ? AND t.is_deleted = 0 ${boardClause}
       ORDER BY rank
       LIMIT ?`
    )
    .bind(...params)
    .all()
    .catch(() => ({ results: [], success: false }));
  return (results as unknown as SearchResult[]) ?? [];
}

async function ftsThreadCount(db: D1Database, q: string, boardId: number | undefined): Promise<number> {
  const ftsq = sanitizeFtsQuery(q);
  const boardClause = boardId ? "AND t.board_id = ?" : "";
  const params: unknown[] = [ftsq];
  if (boardId) params.push(boardId);
  const found = await db
    .prepare(
      `SELECT COUNT(*) AS n
       FROM threads_fts JOIN threads t ON t.id = threads_fts.rowid
       WHERE threads_fts MATCH ? AND t.is_deleted = 0 ${boardClause}`
    )
    .bind(...params)
    .first<{ n: number }>()
    .catch(() => ({ n: 0 }));
  return found?.n ?? 0;
}

async function searchThreadsViaFts(db: D1Database, q: string, boardId: number | undefined, limit: number): Promise<SearchResult[]> {
  try {
    return await ftsThreadRows(db, q, boardId, limit);
  } catch {
    return [];
  }
}

async function searchViaLike(
  db: D1Database,
  q: string,
  boardId: number | undefined,
  page: number,
  perPage: number
): Promise<Paged<SearchResult>> {
  const like = `%${escapeLike(q)}%`;
  const boardClause = boardId ? "AND t.board_id = ?" : "";
  const params: unknown[] = [like, like];
  if (boardId) params.push(boardId);

  const countFound = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM threads t WHERE t.is_deleted = 0 AND (t.title LIKE ? ESCAPE '\\' OR t.content LIKE ? ESCAPE '\\') ${boardClause}`
    )
    .bind(...params)
    .first<{ n: number }>();
  const total = countFound?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * perPage;

  const { results } = await db
    .prepare(
      `SELECT t.id AS threadId, t.title AS threadTitle, t.created_at AS createdAt,
              u.username AS authorUsername, b.slug AS boardSlug, b.name AS boardName,
              t.reply_count AS replyCount, NULL AS snippet, 'thread' AS type
       FROM threads t
       JOIN users u ON u.id = t.user_id
       JOIN boards b ON b.id = t.board_id
       WHERE t.is_deleted = 0 AND (t.title LIKE ? ESCAPE '\\' OR t.content LIKE ? ESCAPE '\\') ${boardClause}
       ORDER BY t.created_at DESC LIMIT ? OFFSET ?`
    )
    .bind(...params, perPage, offset)
    .all();

  return {
    items: results as unknown as SearchResult[],
    total,
    page: safePage,
    perPage,
    totalPages,
  };
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function notificationsFor(userId: number, page: number, perPage: number): Promise<Paged<NotificationView>> {
  await ensureSchema();
  const db = getDb();
  const countSql = "SELECT COUNT(*) AS n FROM notifications WHERE user_id = ?";
  const rowsSql = `
    SELECT n.*, u.username AS actor_username, t.title AS thread_title
    FROM notifications n
    LEFT JOIN users u ON u.id = n.actor_user_id
    LEFT JOIN threads t ON t.id = n.thread_id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC LIMIT ? OFFSET ?
  `;
  const countRow = await db.prepare(countSql).bind(userId).first<{ n: number }>();
  const total = Number(countRow?.n ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * perPage;
  const { results } = await db.prepare(rowsSql).bind(userId, perPage, offset).all();
  return { items: results as unknown as NotificationView[], total, page: safePage, perPage, totalPages };
}

export async function markNotificationsRead(userId: number, ids?: number[]): Promise<void> {
  const db = getDb();
  if (ids && ids.length) {
    const placeholders = ids.map(() => "?").join(",");
    await db
      .prepare(`UPDATE notifications SET read = 1 WHERE user_id = ? AND id IN (${placeholders})`)
      .bind(userId, ...ids)
      .run();
  } else {
    await db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0").bind(userId).run();
  }
}

// ---------------------------------------------------------------------------
// Stats / dashboard
// ---------------------------------------------------------------------------

const ONLINE_WINDOW_MS = 15 * 60 * 1000;

export async function siteStats(): Promise<SiteStats> {
  await ensureSchema();
  const db = getDb();
  const [users, threads, posts, newest, online] = await Promise.all([
    scalar<number>(db, "SELECT COUNT(*) FROM users"),
    scalar<number>(db, "SELECT COUNT(*) FROM threads WHERE is_deleted = 0"),
    scalar<number>(db, "SELECT COUNT(*) FROM posts WHERE is_deleted = 0"),
    row<{ id: number; username: string; created_at: number }>(
      db,
      "SELECT id, username, created_at FROM users ORDER BY id DESC LIMIT 1"
    ),
    scalar<number>(db, "SELECT COUNT(*) FROM users WHERE last_seen_at > ?", now() - ONLINE_WINDOW_MS),
  ]);
  return {
    users: users ?? 0,
    threads: threads ?? 0,
    posts: posts ?? 0,
    messages: (posts ?? 0) + (threads ?? 0),
    newestUser: newest ? { id: newest.id, username: newest.username, created_at: newest.created_at } : null,
    onlineUsers: online ?? 0,
  };
}

export async function topPosters(limit = 8): Promise<{ id: number; username: string; post_count: number }[]> {
  const { results } = await getDb()
    .prepare("SELECT id, username, post_count FROM users WHERE post_count > 0 ORDER BY post_count DESC, id ASC LIMIT ?")
    .bind(limit)
    .all();
  return results as { id: number; username: string; post_count: number }[];
}

export async function latestMembers(limit = 8): Promise<{ id: number; username: string; created_at: number }[]> {
  const { results } = await getDb()
    .prepare("SELECT id, username, created_at FROM users ORDER BY id DESC LIMIT ?")
    .bind(limit)
    .all();
  return results as { id: number; username: string; created_at: number }[];
}

export async function activeThreads(limit = 8): Promise<ThreadView[]> {
  await ensureSchema();
  const { results } = await getDb()
    .prepare(`
      ${THREAD_SELECT}
      WHERE t.is_deleted = 0 AND b.is_enabled = 1
      ORDER BY t.views * 1 + t.reply_count * 5 DESC, COALESCE(t.last_reply_at, t.created_at) DESC
      LIMIT ?
    `)
    .bind(limit)
    .all<ThreadView>();
  return results;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function adminOverview(): Promise<{
  users: number;
  threads: number;
  posts: number;
  openReports: number;
  bannedUsers: number;
  newUsers7d: number;
}> {
  await ensureSchema();
  const db = getDb();
  const weekAgo = now() - 7 * 24 * 60 * 60 * 1000;
  const [users, threads, posts, openReports, banned, newUsers] = await Promise.all([
    scalar<number>(db, "SELECT COUNT(*) FROM users"),
    scalar<number>(db, "SELECT COUNT(*) FROM threads WHERE is_deleted = 0"),
    scalar<number>(db, "SELECT COUNT(*) FROM posts WHERE is_deleted = 0"),
    scalar<number>(db, "SELECT COUNT(*) FROM reports WHERE status = 'open'"),
    scalar<number>(db, "SELECT COUNT(*) FROM users WHERE status = 'banned'"),
    scalar<number>(db, "SELECT COUNT(*) FROM users WHERE created_at > ?", weekAgo),
  ]);
  return {
    users: users ?? 0,
    threads: threads ?? 0,
    posts: posts ?? 0,
    openReports: openReports ?? 0,
    bannedUsers: banned ?? 0,
    newUsers7d: newUsers ?? 0,
  };
}

export async function adminUsers(opts: { page: number; perPage: number; search?: string }): Promise<Paged<PublicUser>> {
  await ensureSchema();
  const db = getDb();
  const search = opts.search?.trim();
  const where = search ? "WHERE u.username_lower LIKE ? ESCAPE '\\'" : "";
  const like = search ? `%${escapeLike(search.toLowerCase())}%` : undefined;
  const countParams = like ? [like] : [];
  const rowsParams = like ? [like] : [];

  const countFound = await db.prepare(`SELECT COUNT(*) AS n FROM users u ${where}`).bind(...countParams).first<{ n: number }>();
  const total = countFound?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / opts.perPage));
  const safePage = Math.min(Math.max(1, opts.page), totalPages);
  const offset = (safePage - 1) * opts.perPage;

  const { results } = await db
    .prepare(
      `SELECT id, username, username_lower, email, email_verified, role, status, ban_reason, created_at, last_seen_at, bio, signature, theme, post_count, thread_count
       FROM users u ${where}
       ORDER BY u.id DESC LIMIT ? OFFSET ?`
    )
    .bind(...rowsParams, opts.perPage, offset)
    .all();
  return { items: results as unknown as PublicUser[], total, page: safePage, perPage: opts.perPage, totalPages };
}

export async function adminReports(page: number, perPage: number): Promise<Paged<ReportRow>> {
  await ensureSchema();
  const db = getDb();
  const countSql = "SELECT COUNT(*) AS n FROM reports";
  const rowsSql = `
    SELECT r.*, ru.username AS reporter_username, t.title AS thread_title,
           p.content AS post_preview, pu.username AS post_author_username
    FROM reports r
    LEFT JOIN users ru ON ru.id = r.reporter_user_id
    LEFT JOIN threads t ON t.id = r.thread_id
    LEFT JOIN posts p ON p.id = r.post_id
    LEFT JOIN users pu ON pu.id = p.user_id
    ORDER BY CASE r.status WHEN 'open' THEN 0 ELSE 1 END, r.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const countRow = await db.prepare(countSql).first<{ n: number }>();
  const total = Number(countRow?.n ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * perPage;
  const { results } = await db.prepare(rowsSql).bind(perPage, offset).all();
  return { items: results as unknown as ReportRow[], total, page: safePage, perPage, totalPages };
}

export async function adminAudit(page: number, perPage: number): Promise<Paged<AuditRow>> {
  await ensureSchema();
  const db = getDb();
  const countSql = "SELECT COUNT(*) AS n FROM audit_log";
  const rowsSql = "SELECT * FROM audit_log ORDER BY id DESC LIMIT ? OFFSET ?";
  const countRow = await db.prepare(countSql).first<{ n: number }>();
  const total = Number(countRow?.n ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * perPage;
  const { results } = await db.prepare(rowsSql).bind(perPage, offset).all();
  return { items: results as unknown as AuditRow[], total, page: safePage, perPage, totalPages };
}