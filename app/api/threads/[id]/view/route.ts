import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { assertSameOrigin, jsonError, jsonOk } from "@/lib/errors";
import { getThreadView, incrementThreadViews } from "@/lib/queries";
import { validateId } from "@/lib/validation";

/** Lightweight view counter hit by the thread page on mount. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const { id } = await params;
    const threadId = validateId(id);
    const db = getDb();
    const thread = await getThreadView(threadId);
    if (!thread || thread.is_deleted) return jsonOk({ views: 0 });
    await incrementThreadViews(threadId);
    return jsonOk({ views: thread.views + 1 });
  } catch (err) {
    return jsonError(err);
  }
}