"use client";

/**
 * Actions for the first post of a thread (the OP). The OP lives in the
 * `threads` table, not `posts`, so edit/delete must target the thread API —
 * reusing the per-post actions here would modify an unrelated post that
 * happens to share the numeric id.
 */

import { useState } from "react";
import { CheckIcon, PencilIcon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
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

export function ThreadOpActions({
  threadId,
  boardSlug,
  isOwner,
  isModerator,
  initialTitle,
  initialContent,
  initialTags,
}: {
  threadId: number;
  boardSlug: string;
  isOwner: boolean;
  isModerator: boolean;
  initialTitle: string;
  initialContent: string;
  initialTags: string;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState(initialTags);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = isOwner || isModerator;
  if (!canEdit) return null;

  const saveEdit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api(`/api/threads/${threadId}`, {
        method: "PATCH",
        json: { action: "edit", title, content, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) },
      });
      if (res.ok) {
        window.location.reload();
      } else {
        setError(res.error ?? "Failed to save changes.");
      }
    } catch {
      setError("A network error occurred.");
    }
    setBusy(false);
  };

  const deleteThread = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api(`/api/threads/${threadId}`, {
        method: "PATCH",
        json: { action: "delete" },
      });
      if (res.ok) {
        window.location.assign(`/board/${boardSlug}`);
      } else {
        setError(res.error ?? "Failed to delete thread.");
        setBusy(false);
      }
    } catch {
      setError("A network error occurred.");
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <FieldGroup className="rounded-lg border p-3">
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor={`op-title-${threadId}`}>Title</FieldLabel>
          <Input
            id={`op-title-${threadId}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`op-content-${threadId}`}>Message</FieldLabel>
          <Textarea
            id={`op-content-${threadId}`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`op-tags-${threadId}`}>Tags (comma separated)</FieldLabel>
          <Input id={`op-tags-${threadId}`} value={tags} onChange={(e) => setTags(e.target.value)} maxLength={120} />
        </Field>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={saveEdit} disabled={busy}>
            {busy ? <Spinner data-icon="inline-start" /> : <CheckIcon data-icon="inline-start" />}
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
            <XIcon data-icon="inline-start" />
            Cancel
          </Button>
        </div>
      </FieldGroup>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button variant="ghost" size="xs" onClick={() => setEditing(true)} className="text-muted-foreground">
        <PencilIcon data-icon="inline-start" />
        Edit
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="xs" disabled={busy} className="text-muted-foreground">
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
            <AlertDialogAction variant="destructive" onClick={deleteThread}>
              Delete thread
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
