import type { Metadata } from "next";
import Link from "next/link";
import { FileSearchIcon, HashIcon, MessageSquareIcon } from "lucide-react";
import { currentUserRSC } from "@/lib/session-rsc";
import { itemsPerPage } from "@/lib/settings";
import { searchForum, SearchResult, listBoards, getBoardBySlugRow } from "@/lib/queries";
import { getDb } from "@/lib/db";
import { SearchBox } from "@/components/search-box";
import { ForumPagination } from "@/components/forum-pagination";
import { EmptyState } from "@/components/empty-state";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RelativeTime } from "@/components/time";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; board?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const boardSlug = sp.board?.trim() ?? "";
  const user = await currentUserRSC();
  const db = getDb();
  const boards = await listBoards(user);

  const board =
    boardSlug && boards.some((b) => b.slug === boardSlug)
      ? await getBoardBySlugRow(db, boardSlug)
      : null;

  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const perPage = itemsPerPage();

  let results: Awaited<ReturnType<typeof searchForum>> | null = null;
  if (q) {
    results = await searchForum({
      query: q,
      boardId: board?.id,
      page,
      perPage,
      viewerRole: user?.role ?? null,
    });
  }

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (boardSlug) params.set("board", boardSlug);
    params.set("page", String(p));
    return `/search?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Search the forum</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find threads by keyword, including thread titles and post contents.
        </p>
      </div>

      <SearchBox initial={q} large autoFocus={false} boardFilter={boardSlug} />

      {q && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {results?.total ?? 0} result{results?.total === 1 ? "" : "s"} for “
            <span className="font-medium text-foreground">{q}</span>”
          </span>
          {board && (
            <Badge variant="secondary">
              in{" "}
              <Link href={`/board/${board.slug}`} className="underline underline-offset-2">
                {board.name}
              </Link>
            </Badge>
          )}
        </div>
      )}

      {q && results && results.items.length > 0 && (
        <Card className="py-2">
          <ul className="px-2">
            {results.items.map((r, idx) => (
              <li key={`${r.type}-${r.threadId}-${r.postId ?? 0}`}>
                {idx > 0 && <Separator />}
                <SearchItem result={r} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {q && results && results.items.length === 0 && (
        <Card className="py-10">
          <EmptyState
            title="No results found"
            description="Try different keywords, or check your spelling."
            icon={<FileSearchIcon />}
          />
        </Card>
      )}

      {q && results && results.totalPages > 1 && (
        <ForumPagination page={page} totalPages={results.totalPages} buildHref={buildHref} />
      )}

      {!q && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Browse categories</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {boards.map((b) => (
              <Button key={b.id} asChild variant="outline" size="sm">
                <Link href={`/search?board=${b.slug}`}>
                  <HashIcon data-icon="inline-start" />
                  {b.name}
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SearchItem({ result }: { result: SearchResult }) {
  return (
    <Link
      href={`/t/${result.threadId}${result.postId ? `?page=${result.postPage ?? 1}#post-${result.postId}` : ""}`}
      className="group block rounded-lg px-2 py-3 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center gap-1.5">
        <Badge variant={result.type === "thread" ? "default" : "outline"}>
          {result.type === "thread" ? "Thread" : "Post"}
        </Badge>
        <span className="text-xs text-muted-foreground">{result.boardName}</span>
      </div>
      <p className="mt-1 font-medium group-hover:underline">{result.threadTitle}</p>
      {result.snippet && (
        <p
          className="mt-0.5 line-clamp-2 text-sm text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: result.snippet }}
        />
      )}
      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <UserAvatar name={result.authorUsername ?? "?"} size="sm" />
          {result.authorUsername}
        </span>
        <span>
          <RelativeTime ts={result.createdAt} />
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquareIcon className="size-3.5" />
          {result.replyCount}
        </span>
      </div>
    </Link>
  );
}
