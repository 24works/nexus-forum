import Link from "next/link";
import { notFound } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { currentUserRSC } from "@/lib/session-rsc";
import { itemsPerPage } from "@/lib/settings";
import { getBoardBySlugRow, boardVisibleTo, boardThreads, ThreadSort } from "@/lib/queries";
import { getDb } from "@/lib/db";
import { ThreadRow } from "@/components/thread-row";
import { ForumPagination } from "@/components/forum-pagination";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
          <Breadcrumb className="mb-1">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{board.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{board.name}</h1>
            {board.is_enabled === 0 && <Badge variant="destructive">Hidden</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{board.description}</p>
        </div>
        {user ? (
          <Button asChild>
            <Link href={`/threads/new?board=${board.id}`}>
              <PlusIcon data-icon="inline-start" />
              New thread
            </Link>
          </Button>
        ) : null}
      </div>

      {/* Sort tabs */}
      <div className="flex flex-wrap gap-1.5">
        {SORTS.map((s) => (
          <Button
            key={s.key}
            asChild
            size="sm"
            variant={sort === s.key ? "default" : "outline"}
          >
            <Link href={`/board/${board.slug}?sort=${s.key}`}>{s.label}</Link>
          </Button>
        ))}
      </div>

      {/* Thread list */}
      <Card className="py-2">
        {data.items.length === 0 ? (
          <EmptyState
            title="No threads in this category yet"
            description="Be the first to open a conversation."
            action={
              <Button asChild>
                <Link href={`/threads/new?board=${board.id}`}>
                  <PlusIcon data-icon="inline-start" />
                  Create the first thread
                </Link>
              </Button>
            }
          />
        ) : (
          <ul className="px-2">
            {data.items.map((thread, idx) => (
              <li key={thread.id}>
                {idx > 0 && <Separator />}
                <ThreadRow thread={thread} showBoard={false} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ForumPagination page={data.page} totalPages={data.totalPages} buildHref={buildHref} />
    </div>
  );
}
