import { NextRequest, NextResponse } from "next/server";
import { getDb, ensureSchema } from "@/lib/db";
import { AppError, assertSameOrigin, clientIp, jsonError, readJson, sleep } from "@/lib/errors";
import { verifyPassword } from "@/lib/crypto";
import { createSession, getPepper, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { validateUsername } from "@/lib/validation";
import { rateLimitEnabled } from "@/lib/settings";
import { checkRateLimit } from "@/lib/rate-limit";
import { toPublicUser, UserRow } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);

    // IP-based brute-force throttle (active when FORUM_RATE_LIMIT_ENABLED is on).
    if (rateLimitEnabled()) {
      const rl = await checkRateLimit({
        bucket: "login",
        limit: 10,
        windowMs: 10 * 60 * 1000,
        subject: clientIp(req),
      });
      if (!rl.allowed) {
        throw new AppError(429, `Too many login attempts. Please try again in ${Math.ceil(rl.retryAfter / 60)} minute(s).`);
      }
    }

    const body = await readJson<{ username?: unknown; password?: unknown }>(req);
    const username = validateUsername(body.username);
    const db = getDb();
    await ensureSchema();

    // Throttle per-account to slow down targeted brute force.
    if (rateLimitEnabled()) {
      const accountRl = await checkRateLimit({
        bucket: "login-user",
        limit: 20,
        windowMs: 15 * 60 * 1000,
        subject: username.toLowerCase(),
      });
      if (!accountRl.allowed) {
        throw new AppError(429, "Too many attempts for this account. Please try again later.");
      }
    }

    const user = await db
      .prepare("SELECT * FROM users WHERE username_lower = ?")
      .bind(username.toLowerCase())
      .first<UserRow>();

    // Constant-time-ish failure path: always do a dummy verify when the user
    // does not exist so response timing does not reveal account existence.
    const password = typeof body.password === "string" ? body.password : "";
    const valid = user
      ? await verifyPassword(password, user.password_hash, getPepper())
      : await verifyPassword(password, "pbkdf2$100000$0000000000000000$0000000000000000000000000000000000000000000000000000000000000000", getPepper());

    if (!user || !valid) {
      // Small artificial delay to throttle rapid guessing.
      await sleep(300 + Math.floor(Math.random() * 400));
      throw new AppError(401, "Invalid username or password.");
    }

    if (user.status === "banned") {
      const reason = user.ban_reason ? ` Reason: ${user.ban_reason}` : "";
      throw new AppError(403, `This account has been banned.${reason}`);
    }

    const sessionToken = await createSession(user.id, clientIp(req), req.headers.get("user-agent") ?? undefined);

    const response = NextResponse.json({ ok: true, user: toPublicUser(user) });
    response.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions(req));
    return response;
  } catch (err) {
    return jsonError(err);
  }
}