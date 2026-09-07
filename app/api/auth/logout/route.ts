import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, jsonError } from "@/lib/errors";
import { destroySession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await destroySession(req);
    const response = new NextResponse(null, { status: 204 });
    response.cookies.set(SESSION_COOKIE, "", {
      ...sessionCookieOptions(req),
      maxAge: 0,
    });
    return response;
  } catch (err) {
    return jsonError(err);
  }
}