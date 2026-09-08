"use client";

import { useState } from "react";
import { FolderInputIcon, LockIcon, MegaphoneIcon, PinIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  const [busy, setBusy] = useState(false);
  const [targetBoard, setTargetBoard] = useState(String(boardId));

  const action = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await api(`/api/threads/${threadId}`, {
        method: "PATCH",
        json: body,
      });
      if (res.ok) {
        if (body.action === "delete") {
          window.location.assign("/");
          return;
        }
        window.location.reload();
      } else {
        toast.error(res.error ?? "Action failed.");
      }
    } catch {
      toast.error("A network error occurred.");
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button size="sm" variant="outline" disabled={busy} onClick={() => action({ action: "pin" })}>
        <PinIcon data-icon="inline-start" />
        {isPinned ? "Unpin" : "Pin"}
      </Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => action({ action: "announce" })}>
        <MegaphoneIcon data-icon="inline-start" />
        {isAnnouncement ? "Unannounce" : "Announce"}
      </Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => action({ action: "lock" })}>
        <LockIcon data-icon="inline-start" />
        {isLocked ? "Unlock" : "Lock"}
      </Button>

      <form
        className="flex items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          action({ action: "move", boardId: Number(targetBoard) });
        }}
      >
        <Select value={targetBoard} onValueChange={setTargetBoard}>
          <SelectTrigger className="h-7 w-40 text-xs" aria-label="Move to category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {boards.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" type="submit" disabled={busy}>
          <FolderInputIcon data-icon="inline-start" />
          Move
        </Button>
      </form>

      {!isDeleted ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive" disabled={busy}>
              <Trash2Icon data-icon="inline-start" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this thread?</AlertDialogTitle>
              <AlertDialogDescription>
                All replies will be hidden as well. This cannot be undone from the forum.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => action({ action: "delete" })}>
                Delete thread
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => action({ action: "undelete" })}>
          <RotateCcwIcon data-icon="inline-start" />
          Restore
        </Button>
      )}

      {busy && <Spinner className="size-3.5 text-muted-foreground" />}
    </div>
  );
}
