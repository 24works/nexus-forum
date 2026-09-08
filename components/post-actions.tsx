"use client";

import { useState } from "react";
import { CheckIcon, FlagIcon, PencilIcon, Trash2Icon, XIcon } from "lucide-react";
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

interface PostActionsProps {
  postId: number;
  threadId: number;
  isOwner: boolean;
  isModerator: boolean;
  initialContent: string;
}

export function PostActions({ postId, isOwner, isModerator, initialContent }: PostActionsProps) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deletePost = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api(`/api/posts/${postId}`, { method: "DELETE" });
      if (res.ok) {
        window.location.reload();
      } else {
        setError(res.error ?? "Failed to delete post.");
        setBusy(false);
      }
    } catch {
      setError("A network error occurred.");
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api(`/api/posts/${postId}`, {
        method: "PATCH",
        json: { content },
      });
      if (res.ok) {
        window.location.reload();
      } else {
        setError(res.error ?? "Failed to save edits.");
      }
    } catch {
      setError("A network error occurred.");
    }
    setBusy(false);
  };

  const submitReport = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api(`/api/posts/${postId}/report`, {
        method: "POST",
        json: { reason },
      });
      if (res.ok) {
        window.location.reload();
      } else {
        setError(res.error ?? "Failed to submit report.");
      }
    } catch {
      setError("A network error occurred.");
    }
    setBusy(false);
  };

  if (editing) {
    return (
      <FieldGroup className="rounded-lg border p-3">
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor={`edit-post-${postId}`}>Edit post</FieldLabel>
          <Textarea
            id={`edit-post-${postId}`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            aria-invalid={error ? true : undefined}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </Field>
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
      {(isOwner || isModerator) && (
        <Button variant="ghost" size="xs" onClick={() => setEditing(true)} className="text-muted-foreground">
          <PencilIcon data-icon="inline-start" />
          Edit
        </Button>
      )}
      {(isOwner || isModerator) && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="xs" disabled={busy} className="text-muted-foreground">
              <Trash2Icon data-icon="inline-start" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this post?</AlertDialogTitle>
              <AlertDialogDescription>
                This post will be permanently removed from the thread.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={deletePost}>
                Delete post
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {reporting ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitReport();
          }}
        >
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            minLength={4}
            maxLength={500}
            placeholder="Why are you reporting this?"
            className="h-7 w-56 text-xs"
          />
          <Button type="submit" size="sm" variant="destructive" disabled={busy}>
            Submit
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setReporting(false)}>
            Cancel
          </Button>
        </form>
      ) : (
        <Button
          variant="ghost"
          size="xs"
          onClick={() => setReporting(true)}
          className="text-muted-foreground"
        >
          <FlagIcon data-icon="inline-start" />
          Report
        </Button>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
