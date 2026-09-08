import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, LockIcon, MegaphoneIcon, PinIcon } from "lucide-react";
import { currentUserRSC } from "@/lib/session-rsc";
import { itemsPerPage } from "@/lib/settings";
import { getThreadView, threadPosts, boardVisibleTo, getBoardRow, listBoards, getThreadPostsForQuote, publicUserById } from "@/lib/queries";
import { getDb } from "@/lib/db";
import { canModerate } from "@/lib/auth";
import { PostRow } from "@/components/post-row";
import { ReplyForm } from "@/components/reply-form";
import { ThreadModActions } from "@/components/thread-mod-actions";
import { ViewTracker } from "@/components/view-tracker";
import { ForumPagination } from "@/components/forum-pagination";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const thread = await getThreadView(Number(id));
  return { title: thread?.title ?? "Thread" };
}

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; quote?: string }>;
}) {
  const [user, { id }, sp] = await Promise.all([currentUserRSC(), params, searchParams]);
  const db = getDb();
  const threadId = Number(id);
  if (!Number.isInteger(threadId) || threadId <= 0) notFound();

  const thread = await getThreadView(threadId);
  if (!thread || thread.is_deleted) notFound();

  const board = await getBoardRow(db, thread.board_id);
  if (!board || !boardVisibleTo(board, user)) notFound();

  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const perPage = itemsPerPage();
  const data = await threadPosts(threadId, page, perPage);
  const isMod = canModerate(user);
  const quoteParam = Number(sp.quote);
  const canPost = Boolean(user && !(thread.is_locked && !isMod));
  const opUser = await publicUserById(thread.user_id);

  const quoteContent = Number.isInteger(quoteParam)
    ? await getThreadPostsForQuote(quoteParam)
    : null;
  const quoteText = quoteContent
    ? `> ${quoteContent.replace(/\n/g, "\n> ")}\n\n`
    : "";

  const boards = await listBoards(user);

  return (
    <div className="flex flex-col gap-4">
      <ViewTracker threadId={threadId} />

      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/board/${thread.board_slug}`}>{thread.board_name}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="line-clamp-1">{thread.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Title area */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {thread.is_announcement ? (
              <Badge>
                <MegaphoneIcon data-icon="inline-start" />
                Announcement
              </Badge>
            ) : null}
            {thread.is_pinned ? (
              <Badge variant="secondary">
                <PinIcon data-icon="inline-start" />
                Pinned
              </Badge>
            ) : null}
            {thread.is_locked ? (
              <Badge variant="outline">
                <LockIcon data-icon="inline-start" />
                Locked
              </Badge>
            ) : null}
            {board.is_enabled === 0 && <Badge variant="destructive">Hidden category</Badge>}
          </div>
          <h1 className="text-xl font-bold leading-snug tracking-tight sm:text-2xl">{thread.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <Link
              href={`/u/${thread.author_username}`}
              className="font-medium underline underline-offset-4 hover:no-underline"
            >
              {thread.author_username}
            </Link>
            <span>·</span>
            <span>{thread.views.toLocaleString()} views</span>
            <span>·</span>
            <span>{thread.reply_count} replies</span>
          </div>
        </div>

        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href={`/board/${thread.board_slug}`}>
            <ArrowLeftIcon data-icon="inline-start" />
            Back to {thread.board_name}
          </Link>
        </Button>
      </div>

      {isMod && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 p-2.5">
          <span className="px-1 text-xs font-medium text-muted-foreground">Moderation:</span>
          <ThreadModActions
            threadId={threadId}
            boardId={thread.board_id}
            boards={boards.map((b) => ({ id: b.id, name: b.name }))}
            isPinned={thread.is_pinned === 1}
            isLocked={thread.is_locked === 1}
            isAnnouncement={thread.is_announcement === 1}
            isDeleted={thread.is_deleted === 1}
          />
        </div>
      )}

      {/* Posts */}
      <Card className="overflow-hidden py-0">
        <PostRow
          post={{
            id: thread.id,
            thread_id: threadId,
            user_id: thread.user_id,
            content: thread.content,
            content_html: thread.content_html,
            is_deleted: 0,
            created_at: thread.created_at,
            updated_at: thread.updated_at,
            edit_count: thread.updated_at && thread.updated_at > thread.created_at ? 1 : 0,
            edit_user_id: null,
            author_username: thread.author_username,
            author_role: opUser?.role,
            author_created_at: opUser?.created_at,
            author_status: opUser?.status,
            thread_title: thread.title,
          }}
          threadId={threadId}
          currentUser={user}
          boardSlug={thread.board_slug ?? ""}
          number={1}
          isOp
          opTags={thread.tags}
        />
        {data.items.map((post, idx) => (
          <div key={post.id}>
            <Separator />
            <PostRow
              post={post}
              threadId={threadId}
              currentUser={user}
              boardSlug={thread.board_slug ?? ""}
              number={(data.page - 1) * perPage + idx + 2}
            />
          </div>
        ))}
      </Card>

      <ForumPagination page={data.page} totalPages={data.totalPages} buildHref={(p) => `/t/${threadId}?page=${p}`} />

      {/* Reply form — remounts when a different quote is requested so the
          quoted text fills the editor on client-side navigation. */}
      {user ? (
        canPost ? (
          <ReplyForm key={quoteText} threadId={threadId} locked={false} initialQuote={quoteText} />
        ) : (
          <Card>
            <CardContent className="text-center text-sm text-muted-foreground">
              This thread is locked and cannot receive new replies.
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-5 text-center text-sm">
            <span className="text-muted-foreground">
              <Link href="/login" className="font-medium underline underline-offset-4 hover:no-underline">
                Log in
              </Link>{" "}
              to join the conversation.
            </span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
