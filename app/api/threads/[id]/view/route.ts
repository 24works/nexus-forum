import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { assertSameOrigin, clientIp, jsonError, jsonOk } from "@/lib/errors";
import { getThreadView, incrementThreadViews } from "@/lib/queries";
import { validateId } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Lightweight view counter hit by the thread page on mount. Each visitor is
 * only counted once per hour per thread so refreshes and scripts cannot
 * inflate the counter.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const { id } = await params;
    const threadId = validateId(id);
    const db = getDb();
    const thread = await getThreadView(threadId);
    if (!thread || thread.is_deleted) return jsonOk({ views: 0 });

    // One view per visitor (IP) and thread per hour.
    const rl = await checkRateLimit({
      bucket: `view:${threadId}`,
      limit: 1,
      windowMs: 60 * 60 * 1000,
      subject: clientIp(req),
    });
    if (rl.allowed) {
      await incrementThreadViews(threadId);
      return jsonOk({ views: thread.views + 1 });
    }
    return jsonOk({ views: thread.views });
  } catch (err) {
    return jsonError(err);
  }
}
