"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Send, Eye, Pencil } from "lucide-react";
import { Button, Textarea } from "@/components/ui";
import { renderMarkdown } from "@/lib/markdown";
import { PostContent } from "@/components/post-content";
import { api } from "@/lib/api-client";

export function ReplyForm({
  threadId,
  initialQuote,
  locked,
}: {
  threadId: number;
  initialQuote?: string;
  locked: boolean;
}) {
  const router = useRouter();
  const [content, setContent] = useState(initialQuote ?? "");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("Your reply is empty.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ page?: number }>(`/api/threads/${threadId}/reply`, {
        method: "POST",
        json: { content },
      });
      if (!res.ok) {
        setError(res.error ?? "Failed to post reply.");
        setBusy(false);
        return;
      }
      setContent("");
      setBusy(false);
      // The API reports the page the new reply landed on.
      router.push(`/t/${threadId}?page=${res.page ?? 1}`);
      router.refresh();
    } catch {
      setError("A network error occurred.");
      setBusy(false);
    }
  };

  if (locked) {
    return null;
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Post a reply</h3>
        <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
          <TabButton active={mode === "write"} onClick={() => setMode("write")} icon={<Pencil className="size-3.5" />} label="Write" />
          <TabButton active={mode === "preview"} onClick={() => setMode("preview")} icon={<Eye className="size-3.5" />} label="Preview" />
        </div>
      </div>

      {mode === "write" ? (
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={'Write your reply… Supports **markdown**, `code`, links and @mentions.'}
          rows={5}
          error={error ?? undefined}
          className="font-sans"
        />
      ) : (
        <div className="min-h-24 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          {content.trim() ? (
            <PostContent html={renderMarkdown(content).html} />
          ) : (
            <p className="text-sm text-slate-400">Nothing to preview yet.</p>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Markdown supported. Be kind and stay on topic.
        </p>
        <Button type="submit" disabled={busy}>
          <Send className="size-4" />
          {busy ? "Posting…" : "Post reply"}
        </Button>
      </div>
    </form>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors " +
        (active
          ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200")
      }
    >
      {icon}
      {label}
    </button>
  );
}