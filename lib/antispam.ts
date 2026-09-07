import { AppError } from "@/lib/errors";
import { now } from "@/lib/db";
import { PublicUser } from "@/lib/types";

/**
 * Lightweight heuristic spam guard for brand-new accounts. Deliberately
 * conservative: only blocks messages that are almost entirely repeated links
 * to the same external domain posted by very new accounts.
 */
export async function guardAgainstSpam(user: PublicUser, content: string): Promise<void> {
  const accountAgeMs = now() - user.created_at;
  const isNewAccount = accountAgeMs < 24 * 60 * 60 * 1000;
  const activity = (user.post_count ?? 0) + (user.thread_count ?? 0);

  if (!isNewAccount || activity > 5) return;

  const links = Array.from(content.matchAll(/https?:\/\/[^\s"'<>]+/gi), (m) => m[0]);
  if (links.length < 8) return;

  const domains = new Map<string, number>();
  for (const link of links) {
    try {
      const host = new URL(link).host.replace(/^www\./, "");
      domains.set(host, (domains.get(host) ?? 0) + 1);
    } catch {
      // ignore malformed urls
    }
  }
  const top = Math.max(0, ...domains.values());
  if (top >= 8) {
    throw new AppError(400, "Your message was flagged as potential spam. Please post a more descriptive message.");
  }
}

/** Max length check for a single string value. */
export function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}