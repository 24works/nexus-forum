import { env } from "cloudflare:workers";

function envValue(key: keyof Cloudflare.Env & string): string {
  return (env as unknown as Record<string, string | undefined>)[key] ?? "";
}

export function forumName(): string {
  return envValue("FORUM_NAME") || "Nexus Forum";
}

export function forumTagline(): string {
  return envValue("FORUM_TAGLINE") || "A modern community forum";
}

/** Comma-separated usernames that are promoted to admin on registration. */
export function configuredAdminUsernames(): string[] {
  return envValue("FORUM_ADMIN_USERNAME")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function bootstrapAdminEnabled(): boolean {
  return envValue("FORUM_BOOTSTRAP_ADMIN") !== "false";
}

export function itemsPerPage(): number {
  const n = Number.parseInt(envValue("FORUM_ITEMS_PER_PAGE"), 10);
  return Number.isInteger(n) && n >= 5 && n <= 100 ? n : 20;
}

export function rateLimitEnabled(): boolean {
  return envValue("FORUM_RATE_LIMIT_ENABLED") !== "false";
}

export function allowRegistration(): boolean {
  return envValue("FORUM_ALLOW_REGISTRATION") !== "false";
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}