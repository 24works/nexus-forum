import type { Metadata } from "next";
import Link from "next/link";
import { ActivityIcon, FileTextIcon, MessageSquareIcon, SparklesIcon, TrophyIcon, UsersIcon } from "lucide-react";
import { siteStats, topPosters, latestMembers, activeThreads } from "@/lib/queries";
import { currentUserRSC } from "@/lib/session-rsc";
import { Stat } from "@/components/stat";
import { SectionHeading } from "@/components/section-heading";
import { EmptyState } from "@/components/empty-state";
import { UserAvatar } from "@/components/user-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RelativeTime, FormattedDate } from "@/components/time";

export const metadata: Metadata = { title: "Stats" };
export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const user = await currentUserRSC();
  const [stats, posters, members, active] = await Promise.all([
    siteStats(),
    topPosters(8),
    latestMembers(8),
    activeThreads(5, user?.role ?? null),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Forum statistics</h1>
        <p className="mt-1 text-sm text-muted-foreground">A quick look at community activity.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Members" value={stats.users.toLocaleString()} />
        <Stat label="Threads" value={stats.threads.toLocaleString()} />
        <Stat label="Posts" value={stats.posts.toLocaleString()} />
        <Stat label="Messages" value={stats.messages.toLocaleString()} />
        <Stat
          label="Online now"
          value={
            <span className="inline-flex items-center gap-1.5">
              <ActivityIcon className="size-5" />
              {stats.onlineUsers.toLocaleString()}
            </span>
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardContent>
            <SectionHeading title="Top posters" />
            {posters.length === 0 ? (
              <EmptyState title="No posts yet" icon={<TrophyIcon />} />
            ) : (
              <ul>
                {posters.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 border-t py-2.5 first:border-t-0">
                    <span className="w-5 text-center text-xs font-semibold text-muted-foreground">{i + 1}</span>
                    <UserAvatar name={p.username} size="sm" />
                    <Link
                      href={`/u/${p.username}`}
                      className="flex-1 truncate text-sm font-medium hover:underline"
                    >
                      {p.username}
                    </Link>
                    <span className="text-xs text-muted-foreground">{p.post_count} posts</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <SectionHeading title="Newest members" />
            <ul>
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 border-t py-2.5 first:border-t-0">
                  <UserAvatar name={m.username} size="sm" />
                  <Link href={`/u/${m.username}`} className="flex-1 truncate text-sm font-medium hover:underline">
                    {m.username}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    joined <RelativeTime ts={m.created_at} />
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <SectionHeading title="Most active threads" />
          {active.length === 0 ? (
            <EmptyState title="No threads yet" icon={<SparklesIcon />} />
          ) : (
            <ul>
              {active.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-2 border-t py-2.5 first:border-t-0">
                  <Link
                    href={`/t/${t.id}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                  >
                    {t.title}
                  </Link>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageSquareIcon className="size-3.5" /> {t.reply_count}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <FileTextIcon className="size-3.5" /> {t.views} views
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <RelativeTime ts={t.last_reply_at ?? t.created_at} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {stats.newestUser && (
        <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <UsersIcon className="size-4" />
          Please welcome our newest member,{" "}
          <Link href={`/u/${stats.newestUser.username}`} className="font-medium underline underline-offset-4 hover:no-underline">
            {stats.newestUser.username}
          </Link>
          , who joined <FormattedDate ts={stats.newestUser.created_at} />.
        </p>
      )}
    </div>
  );
}
