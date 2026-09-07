import { AppError } from "@/lib/errors";

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateUsername(raw: unknown): string {
  if (typeof raw !== "string") throw new AppError(400, "Username is required.", "username");
  const value = raw.trim();
  if (!USERNAME_RE.test(value)) {
    throw new AppError(
      400,
      "Username must be 3-20 characters and may only contain letters, numbers and underscores.",
      "username"
    );
  }
  return value;
}

export function validatePassword(raw: unknown, confirm?: unknown): string {
  if (typeof raw !== "string") throw new AppError(400, "Password is required.", "password");
  if (raw.length < 8 || raw.length > 128) {
    throw new AppError(400, "Password must be between 8 and 128 characters.", "password");
  }
  if (!/[a-zA-Z]/.test(raw) || !/[0-9]/.test(raw)) {
    throw new AppError(400, "Password must contain at least one letter and one number.", "password");
  }
  if (confirm !== undefined && confirm !== raw) {
    throw new AppError(400, "Passwords do not match.", "confirmPassword");
  }
  return raw;
}

export function validateEmail(raw: unknown, required = false): string | null {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!value) {
    if (required) throw new AppError(400, "Email is required.", "email");
    return null;
  }
  if (value.length > 254 || !EMAIL_RE.test(value)) {
    throw new AppError(400, "Please enter a valid email address.", "email");
  }
  return value;
}

/** Returns a normalized slug or null when the input is not a valid slug. */
export function parseSlug(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  if (!SLUG_RE.test(value)) return null;
  return value;
}

export function validateTitle(raw: unknown): string {
  if (typeof raw !== "string") throw new AppError(400, "Title is required.", "title");
  const value = raw.trim();
  if (value.length < 3 || value.length > 120) {
    throw new AppError(400, "Title must be between 3 and 120 characters.", "title");
  }
  return value;
}

const MAX_CONTENT_LENGTH = 60_000;

export function validateContent(raw: unknown): string {
  if (typeof raw !== "string") throw new AppError(400, "Content is required.", "content");
  if (raw.length < 1) throw new AppError(400, "Content is required.", "content");
  if (raw.length > MAX_CONTENT_LENGTH) {
    throw new AppError(400, `Content is too long (max ${MAX_CONTENT_LENGTH} characters).`, "content");
  }
  return raw;
}

export function validateTags(raw: unknown): string[] {
  if (raw === undefined || raw === null) return [];
  const input = Array.isArray(raw) ? raw : String(raw).split(",");
  const tags = input
    .map((t) => String(t).trim().toLowerCase().replace(/\s+/g, "-"))
    .filter((t) => t.length > 0)
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .slice(0, 5);
  for (const tag of tags) {
    if (tag.length > 24 || !/^[a-z0-9-]+$/.test(tag)) {
      throw new AppError(400, `Invalid tag: "${tag}". Use letters, numbers and hyphens (max 24 chars).`, "tags");
    }
  }
  return tags;
}

export function validateBio(raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.length > 1000) throw new AppError(400, "Bio must be 1000 characters or fewer.", "bio");
  return value;
}

export function validateSignature(raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.length > 1000) throw new AppError(400, "Signature must be 1000 characters or fewer.", "signature");
  return value;
}

export function validateId(raw: unknown): number {
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) throw new AppError(400, "Invalid identifier.");
  return num;
}

export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const num = Number(value);
  if (!Number.isInteger(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

export function normalizeReason(raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.length < 4 || value.length > 2000) {
    throw new AppError(400, "Please provide a reason between 4 and 2000 characters.", "reason");
  }
  return value;
}