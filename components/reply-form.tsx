"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon, PencilIcon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
    <Card>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Tabs defaultValue="write">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Post a reply</h3>
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
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={"Write your reply… Supports **markdown**, `code`, links and @mentions."}
                rows={5}
                aria-invalid={error ? true : undefined}
              />
              {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
            </TabsContent>
            <TabsContent value="preview">
              <div className="min-h-24 rounded-lg border p-3">
                {content.trim() ? (
                  <PostContent html={renderMarkdown(content).html} />
                ) : (
                  <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Markdown supported. Be kind and stay on topic.</p>
            <Button type="submit" disabled={busy}>
              {busy ? <Spinner data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
              {busy ? "Posting…" : "Post reply"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
