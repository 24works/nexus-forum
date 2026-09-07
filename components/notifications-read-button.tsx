"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { api } from "@/lib/api-client";

export function MarkAllReadButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const markAll = async () => {
    setBusy(true);
    try {
      await api("/api/notifications/read", {
        method: "POST",
        json: {},
      });
      setDone(true);
      // Refresh so the unread dots and header badge disappear immediately.
      router.refresh();
    } catch {
      // silently ignore
    }
    setBusy(false);
  };

  return (
    <Button variant="ghost" size="sm" disabled={busy || done} onClick={markAll}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
      {done ? "All caught up" : "Mark all read"}
    </Button>
  );
}
