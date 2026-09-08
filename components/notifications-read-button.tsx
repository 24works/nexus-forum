"use client";

import { useState } from "react";
import { CheckCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api-client";

export function MarkAllReadButton() {
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
      // The unread badge lives in the server-rendered header, which the
      // client-side router keeps cached — a full reload re-renders it.
      window.location.reload();
    } catch {
      // silently ignore
      setBusy(false);
    }
  };

  return (
    <Button variant="ghost" size="sm" disabled={busy || done} onClick={markAll}>
      {busy ? <Spinner data-icon="inline-start" /> : <CheckCheckIcon data-icon="inline-start" />}
      {done ? "All caught up" : "Mark all read"}
    </Button>
  );
}
