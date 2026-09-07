import { getDb, ensureSchema, now } from "@/lib/db";
import { sha256Hex } from "@/lib/crypto";

export interface RateLimitOptions {
  /** Logical bucket name, e.g. "login" or "post". */
  bucket: string;
  /** Maximum allowed events inside the window. */
  limit: number;
  windowMs: number;
  /** The entity being limited (IP address, username, etc.). It is hashed before storage. */
  subject: string;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

/**
 * Fixed-window rate limiter backed by D1 (works across the whole edge,
 * unlike in-memory state). Entries are keyed by bucket + hashed subject +
 * time window. Old windows are cleaned up probabilistically.
 */
export async function checkRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  await ensureSchema();
  const db = getDb();
  const { windowMs, limit, bucket, subject } = opts;
  const nowMs = now();
  const period = Math.floor(nowMs / windowMs);
  const subjectHash = (await sha256Hex(`${bucket}:${subject}`)).slice(0, 32);
  const bucketKey = `${bucket}:${subjectHash}`;

  const found = await db
    .prepare("SELECT count FROM rate_limits WHERE bucket = ? AND period_start = ?")
    .bind(bucketKey, period)
    .first<{ count: number }>();

  if (found && found.count >= limit) {
    const nextPeriodStart = (period + 1) * windowMs;
    const retryAfter = Math.max(1, Math.ceil((nextPeriodStart - nowMs) / 1000));
    return { allowed: false, retryAfter };
  }

  await db
    .prepare(
      `INSERT INTO rate_limits (bucket, period_start, count) VALUES (?, ?, 1)
       ON CONFLICT(bucket, period_start) DO UPDATE SET count = count + 1`
    )
    .bind(bucketKey, period)
    .run();

  // Best-effort cleanup of stale rows (~0.5% of requests).
  if (Math.random() < 0.005) {
    await db
      .prepare("DELETE FROM rate_limits WHERE period_start < ?")
      .bind(nowMs - 7 * 24 * 60 * 60 * 1000)
      .run();
  }

  return { allowed: true, retryAfter: 0 };
}