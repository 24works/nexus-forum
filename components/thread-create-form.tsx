"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon, PencilIcon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { renderMarkdown } from "@/lib/markdown";
import { PostContent } from "@/components/post-content";
import { api } from "@/lib/api-client";

export interface BoardChoice {
  id: number;
  name: string;
}

export function ThreadCreateForm({ boards, initialBoard }: { boards: BoardChoice[]; initialBoard?: number }) {
  const router = useRouter();
  const [boardId, setBoardId] = useState(
    String(initialBoard && boards.some((b) => b.id === initialBoard) ? initialBoard : boards[0]?.id ?? 0)
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fieldInvalid = (name: string) => (fieldError === name ? true : undefined);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldError(null);
    try {
      const res = await api<{ url?: string; threadId?: number }>("/api/threads", {
        method: "POST",
        json: {
          boardId: Number(boardId),
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
    <form onSubmit={submit}>
      <FieldGroup>
        <Field data-invalid={fieldInvalid("boardId")} data-disabled={boards.length === 0 ? true : undefined}>
          <FieldLabel htmlFor="thread-board">Category</FieldLabel>
          <Select value={boardId} onValueChange={setBoardId} disabled={boards.length === 0}>
            <SelectTrigger id="thread-board" aria-invalid={fieldInvalid("boardId")}>
              <SelectValue placeholder="Choose a category" />
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
          {fieldError === "boardId" && error && <p className="text-xs text-destructive">{error}</p>}
        </Field>

        <Field data-invalid={fieldInvalid("title")}>
          <FieldLabel htmlFor="thread-title">Title</FieldLabel>
          <Input
            id="thread-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={3}
            maxLength={120}
            placeholder="A clear, descriptive title"
            aria-invalid={fieldInvalid("title")}
          />
          {fieldError === "title" && error && <p className="text-xs text-destructive">{error}</p>}
        </Field>

        <Tabs defaultValue="write">
          <div className="mb-2 flex items-center justify-between">
            <FieldLabel htmlFor="thread-content">Message</FieldLabel>
            <TabsList>
              <TabsTrigger value="write">
                <PencilIcon data-icon="inline-start" />
                Write
              </TabsTrigger>
              <TabsTrigger value="preview">
                <EyeIcon data-icon="inline-start" />
                Preview
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="write">
            <Textarea
              id="thread-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              required
              minLength={1}
              placeholder={
                "Write your thread… Supports **markdown**, `code`, links and @mentions:\n\n**bold**, *italic*, > quotes, lists, ``` code blocks ```"
              }
              aria-invalid={fieldInvalid("content")}
            />
            {fieldError === "content" && error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
          </TabsContent>
          <TabsContent value="preview">
            <div className="min-h-40 rounded-lg border p-4">
              {content.trim() ? (
                <PostContent html={renderMarkdown(content).html} />
              ) : (
                <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Field data-invalid={fieldInvalid("tags")}>
          <FieldLabel htmlFor="thread-tags">Tags (optional, comma separated, max 5)</FieldLabel>
          <Input
            id="thread-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            maxLength={120}
            aria-invalid={fieldInvalid("tags")}
          />
          {fieldError === "tags" && error && <p className="text-xs text-destructive">{error}</p>}
        </Field>

        {fieldError && !["boardId", "title", "content", "tags"].includes(fieldError) && error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Be specific, stay on topic.</p>
          <Button type="submit" disabled={busy || boards.length === 0}>
            {busy ? <Spinner data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
            {busy ? "Posting…" : "Create thread"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
