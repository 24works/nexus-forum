"use client";

/**
 * Actions for the first post of a thread (the OP). The OP lives in the
 * `threads` table, not `posts`, so edit/delete must target the thread API —
 * reusing the per-post actions here would modify an unrelated post that
 * happens to share the numeric id.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { Button, Input, Textarea } from "@/components/ui";
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
  const router = useRouter();
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
        setEditing(false);
        router.refresh();
      } else {
        setError(res.error ?? "Failed to save changes.");
      }
    } catch {
      setError("A network error occurred.");
    }
    setBusy(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this thread? All replies will be hidden as well.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api(`/api/threads/${threadId}`, {
        method: "PATCH",
        json: { action: "delete" },
      });
      if (res.ok) {
        router.push(`/board/${boardSlug}`);
        router.refresh();
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
      <div className="mt-3 flex flex-col gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
        <Textarea label="Message" value={content} onChange={(e) => setContent(e.target.value)} rows={8} required />
        <Input
          label="Tags (comma separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          maxLength={120}
        />
        {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        <div className="flex items-center gap-2">
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
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        <Pencil className="size-3.5" /> Edit
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
      >
        <Trash2 className="size-3.5" /> Delete
      </button>
      {error && <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>}
    </div>
  );
}
