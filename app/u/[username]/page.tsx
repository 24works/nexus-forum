import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MessageSquare, Pencil, FileText, Inbox } from "lucide-react";
import { currentUserRSC } from "@/lib/session-rsc";
import { itemsPerPage } from "@/lib/settings";
import { publicUserByUsername, userThreads, userPosts } from "@/lib/queries";
import { Avatar, Card, RoleBadge, Pagination, EmptyState, Stat } from "@/components/ui";
import { ThreadRow } from "@/components/thread-row";
import { PostContent } from "@/components/post-content";
import { formatDate, relativeTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: username };
}

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const [{ username }, sp, me] = await Promise.all([params, searchParams, currentUserRSC()]);
  const user = await publicUserByUsername(username);
  if (!user) notFound();

  const tab = sp.tab === "posts" ? "posts" : "threads";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const perPage = itemsPerPage();
  const isSelf = me?.id === user.id;

  const threads = tab === "threads" ? await userThreads(user.id, page, perPage) : null;
  const posts = tab === "posts" ? await userPosts(user.id, page, perPage) : null;

  const buildHref = (p: number) => `/u/${user.username}?tab=${tab}&page=${p}`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      {/* Profile header */}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <Avatar name={user.username} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{user.username}</h1>
              <RoleBadge role={user.role} />
              {user.status === "banned" && <span className="text-xs font-medium text-rose-600 dark:text-rose-400">Banned</span>}
            </div>
            {user.bio ? (
              <p className="mt-1.5 whitespace-pre-line text-sm text-slate-600 dark:text-slate-400">{user.bio}</p>
            ) : (
              <p className="mt-1.5 text-sm text-slate-400 dark:text-slate-500">This member has not written a bio yet.</p>
            )}
            {user.signature && (
              <p className="mt-2 border-t border-slate-100 pt-2 text-xs italic text-slate-400 dark:border-slate-800 dark:text-slate-500">
                {user.signature}
              </p>
            )}
          </div>
          {isSelf && (
            <Link
              href="/me/settings"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Pencil className="size-3.5" />
              Edit profile
            </Link>
          )}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Member since"
          value={
            <span className="inline-flex items-center gap-1.5 text-sm">
              <CalendarDays className="size-3.5" />
              {formatDate(user.created_at)}
            </span>
          }
        />
        <Stat label="Posts" value={user.post_count} />
        <Stat label="Threads" value={user.thread_count} />
        <Stat
          label="Last seen"
          value={<span className="text-sm">{user.last_seen_at ? relativeTime(user.last_seen_at) : "—"}</span>}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5">
        <Link
          href={`/u/${user.username}?tab=threads`}
          className={
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
            (tab === "threads"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800")
          }
        >
          <FileText className="size-3.5" />
          Threads
        </Link>
        <Link
          href={`/u/${user.username}?tab=posts`}
          className={
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
            (tab === "posts"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800")
          }
        >
          <MessageSquare className="size-3.5" />
          Posts
        </Link>
      </div>

      {/* Tab content */}
      {tab === "threads" && threads && (
        <Card noPad>
          {threads.items.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No threads yet"
                description={isSelf ? "You have not started any threads yet." : `${user.username} has not started any threads yet.`}
                icon={<FileText className="size-8" />}
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 px-4 sm:px-5 dark:divide-slate-800">
              {threads.items.map((thread) => (
                <li key={thread.id}>
                  <ThreadRow thread={thread} showBoard />
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "posts" && posts && (
        <Card noPad>
          {posts.items.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No posts yet"
                description={isSelf ? "You have not posted yet." : `${user.username} has not posted yet.`}
                icon={<Inbox className="size-8" />}
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 px-4 sm:px-5 dark:divide-slate-800">
              {posts.items.map((post) => (
                <li key={post.id} className="py-3">
                  <Link
                    href={`/t/${post.thread_id}?page=1#post-${post.id}`}
                    className="group block"
                  >
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                      <MessageSquare className="size-3" />
                      <span className="font-medium text-slate-500 group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-400">
                        {post.thread_title}
                      </span>
                      <span>· {relativeTime(post.created_at)}</span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                      <PostContent html={post.content_html} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Pagination
        page={tab === "threads" ? (threads?.page ?? 1) : (posts?.page ?? 1)}
        totalPages={tab === "threads" ? (threads?.totalPages ?? 1) : (posts?.totalPages ?? 1)}
        buildHref={buildHref}
      />
    </div>
  );
}