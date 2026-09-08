import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDaysIcon, FileTextIcon, InboxIcon, MessageSquareIcon, PencilIcon } from "lucide-react";
import { currentUserRSC } from "@/lib/session-rsc";
import { itemsPerPage } from "@/lib/settings";
import { publicUserByUsername, userThreads, userPosts, postPageInThread } from "@/lib/queries";
import { ForumPagination } from "@/components/forum-pagination";
import { EmptyState } from "@/components/empty-state";
import { Stat } from "@/components/stat";
import { ThreadRow } from "@/components/thread-row";
import { UserAvatar } from "@/components/user-avatar";
import { RoleBadge } from "@/components/role-badge";
import { PostContent } from "@/components/post-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FormattedDate, RelativeTime } from "@/components/time";

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
  // Resolve the thread page of each post once, for deep links.
  const postPages = posts
    ? await Promise.all(posts.items.map((p) => postPageInThread(p.id, perPage)))
    : null;

  const buildHref = (p: number) => `/u/${user.username}?tab=${tab}&page=${p}`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      {/* Profile header */}
      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <UserAvatar name={user.username} size="lg" className="size-16 text-2xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{user.username}</h1>
              <RoleBadge role={user.role} />
              {user.status === "banned" && <Badge variant="destructive">Banned</Badge>}
            </div>
            {user.bio ? (
              <p className="mt-1.5 whitespace-pre-line text-sm text-muted-foreground">{user.bio}</p>
            ) : (
              <p className="mt-1.5 text-sm text-muted-foreground">This member has not written a bio yet.</p>
            )}
            {user.signature && (
              <p className="mt-2 border-t pt-2 text-xs italic text-muted-foreground">{user.signature}</p>
            )}
          </div>
          {isSelf && (
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href="/me/settings">
                <PencilIcon data-icon="inline-start" />
                Edit profile
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Member since"
          value={
            <span className="inline-flex items-center gap-1.5 text-sm">
              <CalendarDaysIcon className="size-3.5" />
              <FormattedDate ts={user.created_at} />
            </span>
          }
        />
        <Stat label="Posts" value={user.post_count} />
        <Stat label="Threads" value={user.thread_count} />
        <Stat
          label="Last seen"
          value={<span className="text-sm">{user.last_seen_at ? <RelativeTime ts={user.last_seen_at} /> : "—"}</span>}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5">
        <Button asChild size="sm" variant={tab === "threads" ? "default" : "outline"}>
          <Link href={`/u/${user.username}?tab=threads`}>
            <FileTextIcon data-icon="inline-start" />
            Threads
          </Link>
        </Button>
        <Button asChild size="sm" variant={tab === "posts" ? "default" : "outline"}>
          <Link href={`/u/${user.username}?tab=posts`}>
            <MessageSquareIcon data-icon="inline-start" />
            Posts
          </Link>
        </Button>
      </div>

      {/* Tab content */}
      {tab === "threads" && threads && (
        <Card className="py-2">
          {threads.items.length === 0 ? (
            <EmptyState
              title="No threads yet"
              description={isSelf ? "You have not started any threads yet." : `${user.username} has not started any threads yet.`}
              icon={<FileTextIcon />}
            />
          ) : (
            <ul className="px-2">
              {threads.items.map((thread, idx) => (
                <li key={thread.id}>
                  {idx > 0 && <Separator />}
                  <ThreadRow thread={thread} showBoard />
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "posts" && posts && (
        <Card className="py-2">
          {posts.items.length === 0 ? (
            <EmptyState
              title="No posts yet"
              description={isSelf ? "You have not posted yet." : `${user.username} has not posted yet.`}
              icon={<InboxIcon />}
            />
          ) : (
            <ul className="px-2">
              {posts.items.map((post, idx) => (
                <li key={post.id}>
                  {idx > 0 && <Separator />}
                  <Link
                    href={`/t/${post.thread_id}?page=${postPages?.[idx] ?? 1}#post-${post.id}`}
                    className="group block rounded-lg px-2 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MessageSquareIcon className="size-3" />
                      <span className="font-medium group-hover:underline">{post.thread_title}</span>
                      <span>· <RelativeTime ts={post.created_at} /></span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      <PostContent html={post.content_html} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <ForumPagination
        page={tab === "threads" ? (threads?.page ?? 1) : (posts?.page ?? 1)}
        totalPages={tab === "threads" ? (threads?.totalPages ?? 1) : (posts?.totalPages ?? 1)}
        buildHref={buildHref}
      />
    </div>
  );
}
