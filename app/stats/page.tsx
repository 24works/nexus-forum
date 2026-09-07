import type { Metadata } from "next";
import Link from "next/link";
import { Users, FileText, MessageSquare, Activity, Trophy, Sparkles } from "lucide-react";
import { siteStats, topPosters, latestMembers, activeThreads } from "@/lib/queries";
import { Card, Stat, Avatar, SectionHeading, EmptyState } from "@/components/ui";
import { RelativeTime, FormattedDate } from "@/components/time";

export const metadata: Metadata = { title: "Stats" };
export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const [stats, posters, members, active] = await Promise.all([
    siteStats(),
    topPosters(8),
    latestMembers(8),
    activeThreads(5),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Forum statistics</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          A quick look at community activity.
        </p>
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
              <Activity className="size-5 text-emerald-500" />
              {stats.onlineUsers.toLocaleString()}
            </span>
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionHeading title="Top posters" />
          {posters.length === 0 ? (
            <EmptyState title="No posts yet" icon={<Trophy className="size-8" />} />
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {posters.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-5 text-center text-xs font-semibold text-slate-400">{i + 1}</span>
                  <Avatar name={p.username} size={28} />
                  <Link
                    href={`/u/${p.username}`}
                    className="flex-1 truncate text-sm font-medium text-slate-800 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
                  >
                    {p.username}
                  </Link>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{p.post_count} posts</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHeading title="Newest members" />
          <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5">
                <Avatar name={m.username} size={28} />
                <Link
                  href={`/u/${m.username}`}
                  className="flex-1 truncate text-sm font-medium text-slate-800 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
                >
                  {m.username}
                </Link>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  joined <RelativeTime ts={m.created_at} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <SectionHeading title="Most active threads" />
        {active.length === 0 ? (
          <EmptyState title="No threads yet" icon={<Sparkles className="size-8" />} />
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {active.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <Link
                  href={`/t/${t.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
                >
                  {t.title}
                </Link>
                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                  <MessageSquare className="size-3.5" /> {t.reply_count}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                  <FileText className="size-3.5" /> {t.views} views
                </span>
                <span className="text-xs text-slate-400">
                  <RelativeTime ts={t.last_reply_at ?? t.created_at} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {stats.newestUser && (
        <p className="flex items-center justify-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <Users className="size-4" />
          Please welcome our newest member,{" "}
          <Link
            href={`/u/${stats.newestUser.username}`}
            className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            {stats.newestUser.username}
          </Link>
          , who joined <FormattedDate ts={stats.newestUser.created_at} />.
        </p>
      )}
    </div>
  );
}
