import { env } from "cloudflare:workers";
import { getDb, now, ensureSchema, row, all } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { randomToken, sha256Hex } from "@/lib/crypto";
import { PublicUser, UserRow, toPublicUser } from "@/lib/types";

export const SESSION_COOKIE = "forum_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_THROTTLE_MS = 60_000;
const MAX_SESSIONS_PER_USER = 8;

export interface SessionUser extends PublicUser {}

export function getPepper(): string {
  return (env as { SESSION_SECRET?: string }).SESSION_SECRET ?? "";
}

export function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return part.slice(idx + 1).trim();
      }
    }
  }
  return null;
}

/** True when the request arrived over HTTPS (used for Secure cookie attr). */
export function isSecureRequest(req: Request): boolean {
  const proto = req.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  return new URL(req.url).protocol === "https:";
}

export function sessionCookieOptions(req: Request) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return {
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/**
 * Resolves the currently authenticated user from the request cookies,
 * or null when not logged in / session expired / user banned.
 */
export async function getCurrentUser(req: Request): Promise<SessionUser | null> {
  await ensureSchema();
  const token = getCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const db = getDb();
  const session = await row<{ user_id: number; expires_at: number }>(
    db,
    "SELECT user_id, expires_at FROM sessions WHERE token_hash = ?",
    tokenHash
  );
  if (!session) return null;
  if (session.expires_at <= now()) {
    await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
    return null;
  }
  const user = await getUserById(db, session.user_id);
  if (!user || user.status !== "active") return null;

  // Throttled "last seen" update.
  if (user.last_seen_at < now() - SESSION_THROTTLE_MS) {
    await db
      .prepare("UPDATE users SET last_seen_at = ? WHERE id = ?")
      .bind(now(), user.id)
      .run();
    user.last_seen_at = now();
  }
  return toPublicUser(user);
}

export async function getUserById(db: D1Database, id: number): Promise<UserRow | null> {
  const found = await row<UserRow>(db, "SELECT * FROM users WHERE id = ?", id);
  if (!found) return null;
  return found;
}

export async function getUserByUsername(
  db: D1Database,
  username: string,
  normalized = false
): Promise<UserRow | null> {
  const found = await row<UserRow>(
    db,
    normalized
      ? "SELECT * FROM users WHERE username_lower = ?"
      : "SELECT * FROM users WHERE username_lower = ?",
    normalized ? username : username.trim().toLowerCase()
  );
  return found ?? null;
}

/** Creates a login session and returns the raw cookie token. */
export async function createSession(userId: number, ipHash?: string, userAgent?: string): Promise<string> {
  const db = getDb();
  await ensureSchema();
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const nowMs = now();

  // Bound concurrent sessions: prune expired + oldest beyond MAX_SESSIONS_PER_USER.
  // (sessions has no `id` column — token_hash is the primary key.)
  await db.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(nowMs).run();
  const active = await all<{ token_hash: string }>(
    db,
    "SELECT token_hash FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    userId,
    MAX_SESSIONS_PER_USER
  );
  if (active.length >= MAX_SESSIONS_PER_USER) {
    const keep = active.map((s) => s.token_hash);
    const placeholders = keep.map(() => "?").join(",");
    await db
      .prepare(`DELETE FROM sessions WHERE user_id = ? AND token_hash NOT IN (${placeholders})`)
      .bind(userId, ...keep)
      .run();
  }

  await db
    .prepare(
      "INSERT INTO sessions (token_hash, user_id, created_at, expires_at, ip_hash, user_agent) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(tokenHash, userId, nowMs, nowMs + SESSION_TTL_MS, ipHash, userAgent?.slice(0, 500))
    .run();

  return token;
}

export async function destroySession(req: Request): Promise<void> {
  const token = getCookie(req, SESSION_COOKIE);
  if (!token) return;
  const tokenHash = await sha256Hex(token);
  await getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
}

/** Throws 401 if no user. */
export async function requireUser(req: Request): Promise<SessionUser> {
  const user = await getCurrentUser(req);
  if (!user) throw new AppError(401, "You must be signed in.");
  return user;
}

/** Throws 403 if the user lacks (at least) the given role. */
export function requireRole(user: SessionUser | null, minRole: "member" | "moderator" | "admin"): SessionUser {
  if (!user) throw new AppError(401, "You must be signed in.");
  const rank: Record<string, number> = { member: 0, moderator: 1, admin: 2 };
  if (rank[user.role] < rank[minRole]) {
    throw new AppError(403, "You do not have permission to do that.");
  }
  return user;
}

/** True when the user is a moderator or admin (safely handles not-logged-in). */
export function canModerate(user: SessionUser | null): boolean {
  return Boolean(user) && (user!.role === "admin" || user!.role === "moderator");
}

export function isBanned(user: PublicUser): boolean {
  return user.status === "banned";
}