/** Shared row types for the forum. */

export type Role = "admin" | "moderator" | "member";
export type UserStatus = "active" | "banned";

export interface UserRow {
  id: number;
  username: string;
  username_lower: string;
  password_hash: string;
  email: string | null;
  email_verified: number;
  role: Role;
  status: UserStatus;
  ban_reason: string | null;
  created_at: number;
  last_seen_at: number;
  bio: string;
  signature: string;
  timezone: string | null;
  theme: "system" | "light" | "dark";
  post_count: number;
  thread_count: number;
}

/** A user that is safe to expose to the client/primitives. */
export type PublicUser = Omit<UserRow, "password_hash">;

export interface BoardRow {
  id: number;
  slug: string;
  name: string;
  description: string;
  role: string;
  position: number;
  is_enabled: number;
  thread_count: number;
  post_count: number;
  last_thread_id: number | null;
  last_thread_slug: string | null;
  last_thread_title: string | null;
  last_post_username: string | null;
  last_post_created_at: number | null;
}

export interface ThreadRow {
  id: number;
  board_id: number;
  user_id: number;
  title: string;
  content: string;
  content_html: string;
  tags: string;
  is_pinned: number;
  is_locked: number;
  is_announcement: number;
  is_deleted: number;
  created_at: number;
  updated_at: number;
  views: number;
  reply_count: number;
  last_reply_at: number | null;
  last_reply_user_id: number | null;
  last_reply_username: string | null;
  last_post_id: number | null;
  author_username?: string;
}

export interface PostRow {
  id: number;
  thread_id: number;
  user_id: number;
  content: string;
  content_html: string;
  is_deleted: number;
  created_at: number;
  updated_at: number | null;
  edit_count: number;
  edit_user_id: number | null;
  author_username?: string;
  author_role?: Role;
  author_status?: UserStatus;
}

export interface NotificationRow {
  id: number;
  user_id: number;
  type: string;
  thread_id: number | null;
  post_id: number | null;
  actor_user_id: number | null;
  read: number;
  created_at: number;
  actor_username?: string | null;
  thread_title?: string | null;
}

export interface ReportRow {
  id: number;
  post_id: number;
  thread_id: number | null;
  reporter_user_id: number | null;
  reason: string;
  status: string;
  created_at: number;
  resolved_by: number | null;
  resolved_at: number | null;
  reporter_username?: string | null;
  thread_title?: string | null;
  post_preview?: string | null;
  post_author_username?: string | null;
}

export interface AuditRow {
  id: number;
  actor_user_id: number | null;
  actor_username: string | null;
  action: string;
  target_type: string | null;
  target_id: number | null;
  details: string | null;
  created_at: number;
}

export interface SiteStats {
  users: number;
  threads: number;
  posts: number;
  messages: number;
  newestUser: { id: number; username: string; created_at: number } | null;
  onlineUsers: number;
}

export function toPublicUser(u: UserRow): PublicUser {
  const { password_hash: _pw, ...pub } = u;
  return pub;
}