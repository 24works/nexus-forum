/**
 * Low-level cryptographic helpers built on the Web Crypto API
 * (available in Workers and Node 20+).
 */

const encoder = new TextEncoder();

export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomHex(bytes = 32): string {
  return randomToken(bytes);
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Workers' Web Crypto rejects PBKDF2 iterations above 100000 (NotSupportedError).
export const PBKDF2_ITERATIONS = 100000;
export const PBKDF2_KEY_BYTES = 32;

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    toBufferSource(encoder.encode(password)),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: toBufferSource(salt), iterations },
    keyMaterial,
    PBKDF2_KEY_BYTES * 8
  );
  return new Uint8Array(bits);
}

/** Narrow a typed-array to BufferSource (TypeScript 5.9 generic arrays). */
function toBufferSource(input: Uint8Array): BufferSource {
  return input as unknown as BufferSource;
}

/**
 * Hashes a password with PBKDF2-SHA-256 and a per-user random salt.
 * An optional pepper (from env SESSION_SECRET) is mixed into the salt,
 * adding defense-in-depth if the database leaks.
 *
 * Format: `pbkdf2$<iterations>$<saltHex>$<hashHex>`
 */
export async function hashPassword(password: string, pepper: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const derived = await deriveKey(password, appendPepper(salt, pepper), PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(derived)}`;
}

/** Mixes the (optional) pepper into the per-user salt. */
function appendPepper(salt: Uint8Array, pepper: string): Uint8Array {
  if (!pepper) return salt;
  const peppered = new Uint8Array(salt.length + encoder.encode(pepper).length);
  peppered.set(salt);
  peppered.set(encoder.encode(pepper), salt.length);
  return peppered;
}

export async function verifyPassword(password: string, stored: string, pepper: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations < 10000) return false;
  const salt = fromHex(parts[2]);
  const expected = fromHex(parts[3]);
  const derived = await deriveKey(password, appendPepper(salt, pepper), iterations);
  if (constantTimeEqual(toHex(derived), toHex(expected))) return true;
  // The hash may predate the pepper being set (or survive it being removed);
  // fall back to the unpeppered digest so adding/removing SESSION_SECRET
  // never locks users out.
  if (pepper) {
    const unpeppered = await deriveKey(password, appendPepper(salt, ""), iterations);
    return constantTimeEqual(toHex(unpeppered), toHex(expected));
  }
  return false;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const len = hex.length / 2;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Generates a compact random verification code (numeric). */
export function randomCode(length = 6): string {
  const chars = "0123456789";
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < length; i++) out += chars[buf[i] % chars.length];
  return out;
}