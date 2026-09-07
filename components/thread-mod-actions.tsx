"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Pin, Lock, Trash2, FolderInput, RotateCcw } from "lucide-react";
import { Button, Select } from "@/components/ui";
import { api } from "@/lib/api-client";

export interface BoardOption {
  id: number;
  name: string;
}

export function ThreadModActions({
  threadId,
  boardId,
  boards,
  isPinned,
  isLocked,
  isAnnouncement,
  isDeleted,
}: {
  threadId: number;
  boardId: number;
  boards: BoardOption[];
  isPinned: boolean;
  isLocked: boolean;
  isAnnouncement: boolean;
  isDeleted: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetBoard, setTargetBoard] = useState(boardId);

  const action = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    const res = await api(`/api/threads/${threadId}`, {
      method: "PATCH",
      json: body,
    });
    setBusy(false);
    if (res.ok) {
      if (body.action === "delete") {
        router.push("/");
        return;
      }
      if (body.action === "move") {
        router.refresh();
        return;
      }
      router.refresh();
    } else {
      setError(res.error ?? "Action failed.");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" disabled={busy} onClick={() => action({ action: "pin" })}>
        <Pin className="size-3.5" /> {isPinned ? "Unpin" : "Pin"}
      </Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => action({ action: "announce" })}>
        <Megaphone className="size-3.5" /> {isAnnouncement ? "Unannounce" : "Announce"}
      </Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => action({ action: "lock" })}>
        <Lock className="size-3.5" /> {isLocked ? "Unlock" : "Lock"}
      </Button>

      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          action({ action: "move", boardId: targetBoard });
        }}
      >
        <Select value={targetBoard} onChange={(e) => setTargetBoard(Number(e.target.value))} className="w-40">
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
        <Button size="sm" variant="outline" type="submit" disabled={busy}>
          <FolderInput className="size-3.5" /> Move
        </Button>
      </form>

      {!isDeleted ? (
        <Button size="sm" variant="danger" disabled={busy} onClick={() => action({ action: "delete" })}>
          <Trash2 className="size-3.5" /> Delete
        </Button>
      ) : (
        <Button size="sm" variant="success" disabled={busy} onClick={() => action({ action: "undelete" })}>
          <RotateCcw className="size-3.5" /> Restore
        </Button>
      )}

      {error && <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>}
    </div>
  );
}