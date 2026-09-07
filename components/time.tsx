"use client";

/**
 * Hydration-safe time display components.
 *
 * relativeTime() depends on Date.now() and formatDate() depends on the
 * environment locale, so rendering them directly inside server components
 * produces different output on the server vs. the client (which React flags
 * as a hydration mismatch).
 *
 * These components compute an initial value, let React hydrate with
 * suppressHydrationWarning (text-only differences are ignored for that node),
 * then correct/refresh the text after mount from a timer.
 */

import { useEffect, useRef, useState } from "react";
import { formatDate, formatDateTime, relativeTime } from "@/lib/time";

/** "3h ago" style relative time; refreshes every 30s. */
export function RelativeTime({ ts, className }: { ts: number | null | undefined; className?: string }) {
  const [text, setText] = useState(() => relativeTime(ts));

  // Correct the label after hydration (clock diff) and keep it fresh.
  useEffect(() => {
    const update = () => setText(relativeTime(ts));
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [ts]);

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}

/** Absolute date (e.g. "Sep 7, 2026"), formatted in the browser locale. */
export function FormattedDate({ ts, className }: { ts: number | null | undefined; className?: string }) {
  const [text, setText] = useState(() => formatDate(ts));

  // Re-format with the browser's locale after hydration (server locale may differ).
  useEffect(() => {
    setText(formatDate(ts));
  }, [ts]);

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}

/** Absolute date + time (e.g. "Sep 7, 2026, 3:45 PM"), formatted in the browser locale. */
export function FormattedDateTime({ ts, className }: { ts: number | null | undefined; className?: string }) {
  const [text, setText] = useState(() => formatDateTime(ts));

  useEffect(() => {
    setText(formatDateTime(ts));
  }, [ts]);

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}