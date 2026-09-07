import { NextRequest } from "next/server";
import { AppError, assertSameOrigin, jsonError, jsonOk, readJson } from "@/lib/errors";
import { requireUser } from "@/lib/auth";
import { markNotificationsRead } from "@/lib/queries";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireUser(req);
    const body = await readJson<{ ids?: unknown }>(req);

    let ids: number[] | undefined;
    if (Array.isArray(body.ids)) {
      ids = body.ids.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0).slice(0, 200);
    }
    await markNotificationsRead(user.id, ids);
    return jsonOk({ markedRead: ids?.length ?? null });
  } catch (err) {
    return jsonError(err);
  }
}