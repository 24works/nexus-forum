import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, FileSearch, Hash } from "lucide-react";
import { currentUserRSC } from "@/lib/session-rsc";
import { itemsPerPage } from "@/lib/settings";
import { searchForum, SearchResult, listBoards, getBoardBySlugRow } from "@/lib/queries";
import { getDb } from "@/lib/db";
import { SearchBox } from "@/components/search-box";
import { Card, Badge, Pagination, EmptyState, Avatar } from "@/components/ui";
import { relativeTime } from "@/lib/time";

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
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Search the forum</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Find threads by keyword, including thread titles and post contents.
        </p>
      </div>

      <SearchBox initial={q} large autoFocus={false} boardFilter={boardSlug} />

      {q && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {results?.total ?? 0} result{results?.total === 1 ? "" : "s"} for “
            <span className="font-medium text-slate-800 dark:text-slate-200">{q}</span>”
          </span>
          {board && (
            <Badge color="indigo">
              in <Link href={`/board/${board.slug}`}>{board.name}</Link>
            </Badge>
          )}
        </div>
      )}

      {q && results && results.items.length > 0 && (
        <Card noPad>
          <ul className="divide-y divide-slate-100 px-4 sm:px-5 dark:divide-slate-800">
            {results.items.map((r) => (
              <SearchItem key={`${r.type}-${r.threadId}-${r.postId ?? 0}`} result={r} />
            ))}
          </ul>
        </Card>
      )}

      {q && results && results.items.length === 0 && (
        <EmptyState
          title="No results found"
          description="Try different keywords, or check your spelling."
          icon={<FileSearch className="size-8" />}
        />
      )}

      {q && results && results.totalPages > 1 && (
        <Pagination page={page} totalPages={results.totalPages} buildHref={buildHref} />
      )}

      {!q && (
        <Card className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Browse categories</h2>
          <div className="flex flex-wrap gap-2">
            {boards.map((b) => (
              <Link
                key={b.id}
                href={`/search?board=${b.slug}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Hash className="size-3.5" />
                {b.name}
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function SearchItem({ result }: { result: SearchResult }) {
  return (
    <li className="py-3">
      <Link href={`/t/${result.threadId}${result.postId ? `?page=1#post-${result.postId}` : ""}`} className="group block">
        <div className="flex items-center gap-1.5">
          <Badge color={result.type === "thread" ? "indigo" : "slate"}>
            {result.type === "thread" ? "Thread" : "Post"}
          </Badge>
          <Link href={`/board/${result.boardSlug}`} className="text-xs text-slate-400 hover:underline">
            {result.boardName}
          </Link>
        </div>
        <p className="mt-1 font-medium text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
          {result.threadTitle}
        </p>
        {result.snippet && (
          <p
            className="mt-0.5 line-clamp-2 text-sm text-slate-500 dark:text-slate-400"
            dangerouslySetInnerHTML={{ __html: result.snippet }}
          />
        )}
        <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Avatar name={result.authorUsername ?? "?"} size={16} className="rounded-full" />
            {result.authorUsername}
          </span>
          <span>{relativeTime(result.createdAt)}</span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3.5" />
            {result.replyCount}
          </span>
        </div>
      </Link>
    </li>
  );
}