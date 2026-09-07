import { env } from "cloudflare:workers";
import { SCHEMA_STATEMENTS, UNIQUE_EMAIL_INDEX_SQL } from "@/db/schema";

export type DB = D1Database;

/**
 * Returns the D1 binding. `cloudflare:workers` exposes bindings
 * in both the RSC environment (dev + prod) and route handlers.
 */
export function getDb(): DB {
  return env.DB as DB;
}

export function now(): number {
  return Date.now();
}

let schemaReady: Promise<void> | null = null;

/**
 * Applies the idempotent forum schema to the database exactly once per
 * isolate. Called lazily by every query path, so a brand-new D1 database
 * (local or remote) works with zero external setup.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = applySchema(getDb());
  }
  return schemaReady;
}

async function applySchema(db: DB): Promise<void> {
  // SCHEMA_STATEMENTS is an explicit array of complete SQL statements
  // (trigger bodies are kept whole, so naive `;` splitting is avoided).
  await db.batch(SCHEMA_STATEMENTS.map((sql) => db.prepare(sql)));
  // Best-effort: a legacy database with duplicate emails cannot take the
  // unique index; everything else must still initialize.
  try {
    await db.prepare(UNIQUE_EMAIL_INDEX_SQL).run();
  } catch (err) {
    console.error("[db] could not create unique email index:", err);
  }
}

/** Runs a batch of prepared statements atomically. */
export async function execBatch(db: DB, statements: { sql: string; params?: unknown[] }[]): Promise<D1Result[]> {
  return db.batch(statements.map((s) => db.prepare(s.sql).bind(...(s.params ?? []))));
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export async function withPagination<T>(
  db: DB,
  opts: {
    page: number;
    perPage: number;
    countSql: string;
    countParams?: unknown[];
    rowsSql: string;
    rowsParams?: unknown[];
    rowMapper?: (row: unknown) => T;
  }
): Promise<Paged<T>> {
  const countRow = await db
    .prepare(opts.countSql)
    .bind(...(opts.countParams ?? []))
    .first<{ n: number }>();
  const total = Number(countRow?.n ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / opts.perPage));
  const safePage = Math.min(Math.max(1, opts.page), totalPages);
  const offset = (safePage - 1) * opts.perPage;

  const { results } = await db
    .prepare(opts.rowsSql)
    .bind(...(opts.rowsParams ?? []), opts.perPage, offset)
    .all<T>();

  return {
    items: opts.rowMapper ? results.map(opts.rowMapper) : (results as T[]),
    total,
    page: safePage,
    perPage: opts.perPage,
    totalPages,
  };
}

/** Reads a single scalar value (first column of the first row). */
export async function scalar<T>(db: DB, sql: string, ...params: unknown[]): Promise<T | null> {
  const { results } = await db.prepare(sql).bind(...params).all();
  if (!results.length) return null;
  const values = Object.values(results[0] as Record<string, unknown>);
  return (values[0] as T) ?? null;
}

/** Reads a single row or null. */
export async function row<T>(db: DB, sql: string, ...params: unknown[]): Promise<T | null> {
  const found = await db.prepare(sql).bind(...params).first<T>();
  return found ?? null;
}

/** Reads all rows. */
export async function all<T>(db: DB, sql: string, ...params: unknown[]): Promise<T[]> {
  const { results } = await db.prepare(sql).bind(...params).all<T>();
  return results as T[];
}