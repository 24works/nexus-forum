import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { currentUserRSC } from "@/lib/session-rsc";
import { itemsPerPage } from "@/lib/settings";
import { getBoardBySlugRow, boardVisibleTo, boardThreads, ThreadSort } from "@/lib/queries";
import { getDb } from "@/lib/db";
import { ThreadRow } from "@/components/thread-row";
import { Card, Pagination, EmptyState, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

const SORTS: { key: ThreadSort; label: string }[] = [
  { key: "latest", label: "Latest" },
  { key: "hot", label: "Hot" },
  { key: "newest", label: "New" },
  { key: "views", label: "Top viewed" },
  { key: "oldest", label: "Oldest" },
];

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const [user, { slug }, sp] = await Promise.all([currentUserRSC(), params, searchParams]);
  const db = getDb();

  const board = await getBoardBySlugRow(db, slug);
  if (!board || !boardVisibleTo(board, user)) notFound();

  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const sortParam = (sp.sort ?? "latest") as ThreadSort;
  const sort: ThreadSort = SORTS.some((s) => s.key === sortParam) ? sortParam : "latest";
  const perPage = itemsPerPage();

  const data = await boardThreads(board.id, page, perPage, sort);

  const buildHref = (p: number) => `/board/${board.slug}?sort=${sort}&page=${p}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb + heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <nav className="mb-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              Home
            </Link>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-200">{board.name}</span>
          </nav>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{board.name}</h1>
            {board.is_enabled === 0 && <Badge color="rose">Hidden</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{board.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <Link
              href={`/threads/new?board=${board.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              <Plus className="size-4" />
              New thread
            </Link>
          ) : null}
        </div>
      </div>

      {/* Sort tabs */}
      <div className="flex flex-wrap gap-1.5">
        {SORTS.map((s) => (
          <Link
            key={s.key}
            href={`/board/${board.slug}?sort=${s.key}`}
            className={
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
              (sort === s.key
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800")
            }
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Thread list */}
      <Card noPad>
        {data.items.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No threads in this category yet"
              description="Be the first to open a conversation."
              action={
                <Link
                  href={`/threads/new?board=${board.id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  <Plus className="size-4" />
                  Create the first thread
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 px-4 sm:px-5 dark:divide-slate-800">
            {data.items.map((thread) => (
              <li key={thread.id}>
                <ThreadRow thread={thread} showBoard={false} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Pagination page={data.page} totalPages={data.totalPages} buildHref={buildHref} />
    </div>
  );
}