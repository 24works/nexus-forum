"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Eye, Pencil, Tags } from "lucide-react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { renderMarkdown } from "@/lib/markdown";
import { PostContent } from "@/components/post-content";
import { api } from "@/lib/api-client";

export interface BoardChoice {
  id: number;
  name: string;
}

export function ThreadCreateForm({ boards, initialBoard }: { boards: BoardChoice[]; initialBoard?: number }) {
  const router = useRouter();
  const [boardId, setBoardId] = useState(initialBoard && boards.some((b) => b.id === initialBoard) ? initialBoard : boards[0]?.id ?? 0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldError(null);
    try {
      const res = await api<{ url?: string; threadId?: number }>("/api/threads", {
        method: "POST",
        json: {
          boardId,
          title,
          content,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        },
      });
      if (!res.ok) {
        if (res.field) setFieldError(res.field);
        setError(res.error ?? "Could not create thread.");
        setBusy(false);
        return;
      }
      router.push(res.url ?? `/t/${res.threadId}`);
      router.refresh();
    } catch {
      setError("A network error occurred.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Select
        label="Category"
        value={boardId}
        onChange={(e) => setBoardId(Number(e.target.value))}
        error={fieldError === "boardId" ? error ?? undefined : undefined}
      >
        {boards.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </Select>

      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        minLength={3}
        maxLength={120}
        placeholder="A clear, descriptive title"
        error={fieldError === "title" ? error ?? undefined : undefined}
      />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Message</span>
          <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            <ModeTab active={mode === "write"} onClick={() => setMode("write")} icon={<Pencil className="size-3.5" />} label="Write" />
            <ModeTab active={mode === "preview"} onClick={() => setMode("preview")} icon={<Eye className="size-3.5" />} label="Preview" />
          </div>
        </div>
        {mode === "write" ? (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            required
            minLength={1}
            placeholder={"Write your thread… Supports **markdown**, `code`, links and @mentions:\n\n**bold**, *italic*, > quotes, lists, ``` code blocks ```"}
            error={fieldError === "content" ? error ?? undefined : undefined}
          />
        ) : (
          <div className="min-h-40 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            {content.trim() ? (
              <PostContent html={renderMarkdown(content).html} />
            ) : (
              <p className="text-sm text-slate-400">Nothing to preview yet.</p>
            )}
          </div>
        )}
      </div>

      <Input
        label="Tags (optional, comma separated, max 5)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        maxLength={120}
        error={fieldError === "tags" ? error ?? undefined : undefined}
      />

      {fieldError && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          <Tags className="mr-1 inline size-3" />
          Be specific, stay on topic.
        </p>
        <Button type="submit" disabled={busy || boards.length === 0}>
          <Send className="size-4" />
          {busy ? "Posting…" : "Create thread"}
        </Button>
      </div>
    </form>
  );
}

function ModeTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
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