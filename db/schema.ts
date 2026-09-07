/**
 * Database schema for the forum (D1 / SQLite).
 *
 * Timestamps are stored as Unix epoch milliseconds (INTEGER).
 * This schema is idempotent and applied lazily on first request
 * (`ensureSchema` in lib/db.ts), so a freshly provisioned D1 database
 * initializes itself without any external migration step.
 *
 * Statements are provided as an explicit array (one complete SQL statement
 * per entry). We deliberately avoid splitting a single SQL text on `;`,
 * because trigger bodies use `BEGIN ... END;` blocks whose inner `;` would
 * otherwise produce broken fragments (e.g. a dangling `END`).
 */

export const SCHEMA_STATEMENTS: string[] = [
  // ---- meta ----
  `CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
)`,

  // ---- users ----
  `CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  username_lower TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email TEXT DEFAULT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  ban_reason TEXT DEFAULT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL DEFAULT 0,
  bio TEXT NOT NULL DEFAULT '',
  signature TEXT NOT NULL DEFAULT '',
  timezone TEXT DEFAULT NULL,
  theme TEXT NOT NULL DEFAULT 'system',
  post_count INTEGER NOT NULL DEFAULT 0,
  thread_count INTEGER NOT NULL DEFAULT 0
)`,

  // ---- sessions ----
  `CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ip_hash TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`,

  // ---- email tokens (verification / password reset) ----
  `CREATE TABLE IF NOT EXISTS email_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`,

  // ---- boards ----
  `CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'everyone',
  position INTEGER NOT NULL DEFAULT 0,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  thread_count INTEGER NOT NULL DEFAULT 0,
  post_count INTEGER NOT NULL DEFAULT 0,
  last_thread_id INTEGER,
  last_thread_slug TEXT,
  last_thread_title TEXT,
  last_post_username TEXT,
  last_post_created_at INTEGER
)`,

  // ---- threads ----
  `CREATE TABLE IF NOT EXISTS threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '',
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_locked INTEGER NOT NULL DEFAULT 0,
  is_announcement INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  reply_count INTEGER NOT NULL DEFAULT 0,
  last_reply_at INTEGER,
  last_reply_user_id INTEGER,
  last_reply_username TEXT,
  last_post_id INTEGER,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`,

  // ---- posts ----
  `CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT NOT NULL,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  edit_count INTEGER NOT NULL DEFAULT 0,
  edit_user_id INTEGER,
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`,

  // ---- notifications ----
  `CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  thread_id INTEGER,
  post_id INTEGER,
  actor_user_id INTEGER,
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`,

  // ---- reports ----
  `CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  thread_id INTEGER,
  reporter_user_id INTEGER,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL,
  resolved_by INTEGER,
  resolved_at INTEGER,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
)`,

  // ---- rate limiting buckets ----
  `CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT NOT NULL,
  period_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, period_start)
)`,

  // ---- audit log ----
  `CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER,
  actor_username TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id INTEGER,
  details TEXT,
  created_at INTEGER NOT NULL
)`,

  // ---- indexes ----
  `CREATE INDEX IF NOT EXISTS idx_boards_position ON boards(position)`,
  `CREATE INDEX IF NOT EXISTS idx_threads_board ON threads(board_id, is_deleted, is_pinned, is_announcement, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_threads_board_last ON threads(board_id, is_pinned, is_announcement, last_reply_at)`,
  `CREATE INDEX IF NOT EXISTS idx_threads_user ON threads(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_threads_created ON threads(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_posts_thread ON posts(thread_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_posts_thread_deleted ON posts(thread_id, is_deleted, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`,
  `CREATE INDEX IF NOT EXISTS idx_email_tokens ON email_tokens(token_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at)`,
  // ---- FTS5 full-text search (external-content tables + sync triggers) ----
  `CREATE VIRTUAL TABLE IF NOT EXISTS threads_fts USING fts5(title, content, content='threads', content_rowid='id')`,
  `CREATE TRIGGER IF NOT EXISTS threads_ai AFTER INSERT ON threads BEGIN
  INSERT INTO threads_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END`,
  `CREATE TRIGGER IF NOT EXISTS threads_ad AFTER DELETE ON threads BEGIN
  INSERT INTO threads_fts(threads_fts, rowid, title, content) VALUES ('delete', old.id, old.title, old.content);
END`,
  `CREATE TRIGGER IF NOT EXISTS threads_au AFTER UPDATE OF title, content ON threads BEGIN
  INSERT INTO threads_fts(threads_fts, rowid, title, content) VALUES ('delete', old.id, old.title, old.content);
  INSERT INTO threads_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END`,
  `CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(content, content='posts', content_rowid='id')`,
  `CREATE TRIGGER IF NOT EXISTS posts_ai AFTER INSERT ON posts BEGIN
  INSERT INTO posts_fts(rowid, content) VALUES (new.id, new.content);
END`,
  `CREATE TRIGGER IF NOT EXISTS posts_ad AFTER DELETE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, content) VALUES ('delete', old.id, old.content);
END`,
  `CREATE TRIGGER IF NOT EXISTS posts_au AFTER UPDATE OF content ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, content) VALUES ('delete', old.id, old.content);
  INSERT INTO posts_fts(rowid, content) VALUES (new.id, new.content);
END`,

  // ---- seed boards + schema version (idempotent) ----
  `INSERT OR IGNORE INTO boards (slug, name, description, role, position) VALUES
  ('announcements', 'Announcements', 'Official news and announcements from the staff.', 'everyone', 1),
  ('general', 'General Discussion', 'Talk about anything and everything.', 'everyone', 2),
  ('introductions', 'Introductions', 'New here? Tell us a little about yourself.', 'everyone', 3),
  ('technical', 'Technical Support', 'Ask questions and get help with technical issues.', 'everyone', 4),
  ('off-topic', 'Off-Topic', 'Relaxed conversations that do not fit elsewhere.', 'everyone', 5)`,
  `INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', '1')`,
];

/**
 * Statement applied separately from the main batch: creating a UNIQUE index
 * fails on legacy databases that already contain duplicate emails, and that
 * must not prevent the rest of the schema from initializing.
 */
export const UNIQUE_EMAIL_INDEX_SQL =
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)`;

export const SEED_ADMIN_USERNAME = "admin";

/** Default thread title/body used when seeding demo content (only if enabled). */
export const DEMO_SEED_ENABLED = false;