import { cookies, headers } from "next/headers";
import { getDb, ensureSchema, now } from "@/lib/db";
import { sha256Hex } from "@/lib/crypto";
import { toPublicUser, UserRow } from "@/lib/types";
import { SESSION_COOKIE, SessionUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";

export const THEME_COOKIE = "theme";

export type Theme = "system" | "light" | "dark";

/** Reads the raw session token cookie from the RSC request context. */
async function sessionTokenRSC(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

/** Resolves the current user during server component rendering. */
export async function currentUserRSC(): Promise<SessionUser | null> {
  await ensureSchema();
  const token = await sessionTokenRSC();
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const db = getDb();
  const session = await db
    .prepare("SELECT user_id, expires_at FROM sessions WHERE token_hash = ?")
    .bind(tokenHash)
    .first<{ user_id: number; expires_at: number }>();
  if (!session) return null;
  if (session.expires_at <= now()) {
    await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
    return null;
  }
  const user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(session.user_id).first<UserRow>();
  if (!user || user.status !== "active") return null;
  return toPublicUser(user);
}

/** True while serving the current dynamic page request. */
export async function headersRSC(): Promise<Headers> {
  return new Headers(await headers());
}

/** Reads the theme preference cookie (with a system default fallback). */
export async function themePreferenceRSC(): Promise<Theme> {
  const cookieStore = await cookies();
  const value = cookieStore.get(THEME_COOKIE)?.value;
  if (value === "light" || value === "dark") return value;
  return "system";
}

/** Resolves the theme to an explicit light/dark class for <html>. */
export async function resolveThemeClass(): Promise<"light" | "dark"> {
  const pref = await themePreferenceRSC();
  if (pref === "dark") return "dark";
  if (pref === "light") return "light";
  // system: choose the default rendered theme (light) unless CSS media queries
  // are used later by the client toggle.
  return "light";
}

/** Current request URL for link building / canonical endpoints. */
export async function requestUrlRSC(): Promise<URL> {
  const h = await headersRSC();
  const forwarded = h.get("x-forwarded-proto");
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = forwarded ? forwarded.split(",")[0].trim() : "http";
  return new URL(`${proto}://${host}`);
}

/** Unread notification badge count for the authenticated user (or null). */
export async function unreadCountRSC(): Promise<number | null> {
  const user = await currentUserRSC();
  if (!user) return null;
  return getUnreadNotificationCount(user.id);
}