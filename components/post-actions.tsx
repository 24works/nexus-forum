"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Flag, X, Check } from "lucide-react";
import { Button, Textarea } from "@/components/ui";
import { api } from "@/lib/api-client";

interface PostActionsProps {
  postId: number;
  threadId: number;
  isOwner: boolean;
  isModerator: boolean;
  initialContent: string;
}

export function PostActions({ postId, threadId, isOwner, isModerator, initialContent }: PostActionsProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!window.confirm("Delete this post permanently?")) return;
    setBusy(true);
    setError(null);
    const res = await api(`/api/posts/${postId}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(res.error ?? "Failed to delete post.");
  };

  const saveEdit = async () => {
    setBusy(true);
    setError(null);
    const res = await api(`/api/posts/${postId}`, {
      method: "PATCH",
      json: { content },
    });
    setBusy(false);
    if (res.ok) {
      setEditing(false);
      router.refresh();
    } else {
      setError(res.error ?? "Failed to save edits.");
    }
  };

  const submitReport = async () => {
    setBusy(true);
    setError(null);
    const res = await api(`/api/posts/${postId}/report`, {
      method: "POST",
      json: { reason },
    });
    setBusy(false);
    if (res.ok) {
      setReporting(false);
      setReason("");
      router.refresh();
    } else {
      setError(res.error ?? "Failed to submit report.");
    }
  };

  if (editing) {
    return (
      <div className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          label="Edit post"
          error={error ?? undefined}
        />
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" onClick={saveEdit} disabled={busy}>
            <Check className="size-4" /> Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
            <X className="size-4" /> Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(isOwner || isModerator) && (
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <Pencil className="size-3.5" /> Edit
        </button>
      )}
      {(isOwner || isModerator) && (
        <button
          onClick={handleDelete}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
        >
          <Trash2 className="size-3.5" /> Delete
        </button>
      )}

      {reporting ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitReport();
          }}
        >
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            minLength={4}
            maxLength={500}
            placeholder="Why are you reporting this?"
            className="w-56 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <Button type="submit" size="sm" variant="danger" disabled={busy}>
            Submit
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setReporting(false)}>
            Cancel
          </Button>
        </form>
      ) : (
        <button
          onClick={() => setReporting(true)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:text-slate-400 dark:hover:bg-amber-500/10 dark:hover:text-amber-400"
        >
          <Flag className="size-3.5" /> Report
        </button>
      )}
      {error && <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>}
    </div>
  );
}