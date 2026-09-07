import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, Megaphone, Pin } from "lucide-react";
import { currentUserRSC } from "@/lib/session-rsc";
import { itemsPerPage } from "@/lib/settings";
import { getThreadView, threadPosts, boardVisibleTo, getBoardRow, listBoards, getThreadPostsForQuote, publicUserById } from "@/lib/queries";
import { getDb } from "@/lib/db";
import { canModerate } from "@/lib/auth";
import { PostRow } from "@/components/post-row";
import { ReplyForm } from "@/components/reply-form";
import { ThreadModActions } from "@/components/thread-mod-actions";
import { ViewTracker } from "@/components/view-tracker";
import { Card, Badge, Pagination } from "@/components/ui";

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
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400">
          Home
        </Link>
        <span>/</span>
        <Link href={`/board/${thread.board_slug}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">
          {thread.board_name}
        </Link>
        <span>/</span>
        <span className="line-clamp-1 text-slate-700 dark:text-slate-200">{thread.title}</span>
      </nav>

      {/* Title area */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {thread.is_announcement ? (
              <Badge color="amber">
                <Megaphone className="size-3" /> Announcement
              </Badge>
            ) : null}
            {thread.is_pinned ? (
              <Badge color="sky">
                <Pin className="size-3" /> Pinned
              </Badge>
            ) : null}
            {thread.is_locked ? (
              <Badge color="slate">
                <Lock className="size-3" /> Locked
              </Badge>
            ) : null}
            {board.is_enabled === 0 && <Badge color="rose">Hidden category</Badge>}
          </div>
          <h1 className="text-xl font-bold leading-snug text-slate-900 sm:text-2xl dark:text-white">{thread.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <Link href={`/u/${thread.author_username}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              {thread.author_username}
            </Link>
            <span>·</span>
            <span>{thread.views.toLocaleString()} views</span>
            <span>·</span>
            <span>{thread.reply_count} replies</span>
          </div>
        </div>

        <Link
          href={`/board/${thread.board_slug}`}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="size-3.5" /> Back to {thread.board_name}
        </Link>
      </div>

      {isMod && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
          <span className="px-1 text-xs font-medium text-amber-700 dark:text-amber-300">Moderation:</span>
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
      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
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
          <PostRow
            key={post.id}
            post={post}
            threadId={threadId}
            currentUser={user}
            boardSlug={thread.board_slug ?? ""}
            number={(data.page - 1) * perPage + idx + 2}
          />
        ))}
      </div>

      <Pagination page={data.page} totalPages={data.totalPages} buildHref={(p) => `/t/${threadId}?page=${p}`} />

      {/* Reply form — remounts when a different quote is requested so the
          quoted text fills the editor on client-side navigation. */}
      {user ? (
        canPost ? (
          <ReplyForm key={quoteText} threadId={threadId} locked={false} initialQuote={quoteText} />
        ) : (
          <Card className="text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This thread is locked and cannot receive new replies.
            </p>
          </Card>
        )
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-6 text-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-slate-500 dark:text-slate-400">
            <Link href="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              Log in
            </Link>{" "}
            to join the conversation.
          </span>
        </div>
      )}
    </div>
  );
}