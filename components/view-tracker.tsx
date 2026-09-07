"use client";

import { useEffect, useRef } from "react";

/** Counts a thread view once per page load (client-side). */
export function ViewTracker({ threadId }: { threadId: number }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    fetch(`/api/threads/${threadId}/view`, {
      method: "POST",
      headers: { origin: window.location.origin },
      keepalive: true,
    }).catch(() => {});
  }, [threadId]);
  return null;
}