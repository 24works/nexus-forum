import Link from "next/link";
import { Activity, MessageSquare, Users, Zap } from "lucide-react";
import { currentUserRSC } from "@/lib/session-rsc";
import { forumName } from "@/lib/settings";
import { listBoards, latestThreads, siteStats } from "@/lib/queries";
import { SearchBox } from "@/components/search-box";
import { BoardCard } from "@/components/board-card";
import { ThreadRow } from "@/components/thread-row";
import { Card, EmptyState, Stat, SectionHeading } from "@/components/ui";
import { pluralize } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await currentUserRSC();
  const [boards, threads, stats] = await Promise.all([listBoards(user), latestThreads(8), siteStats()]);

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-6 py-12 sm:px-10">
        <div className="absolute -right-20 -top-20 size-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-24 right-32 size-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative z-10 flex flex-col items-start gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{forumName()}</h1>
          <p className="max-w-xl text-sm leading-6 text-indigo-100">
            A modern community powered by Cloudflare Workers. Join the conversation, ask questions, share ideas and
            connect with like-minded people.
          </p>
          <SearchBox large autoFocus={false} />
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Members" value={pluralize(stats.users, "member", "members")} />
        <Stat label="Threads" value={pluralize(stats.threads, "thread", "threads")} />
        <Stat label="Posts" value={stats.posts.toLocaleString()} />
        <Stat label="Online now" value={stats.onlineUsers} />
      </section>

      {/* Boards */}
      <section>
        <SectionHeading title="Categories" />
        {boards.length === 0 ? (
          <EmptyState title="No categories yet" description="An administrator needs to create the first category." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        )}
      </section>

      {/* Recent threads */}
      <section>
        <SectionHeading title="Recent threads" href="/search" linkLabel="Search everything" />
        <Card noPad>
          {threads.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No threads yet"
                description="Start the conversation by creating the first thread."
                icon={<MessageSquare className="size-8" />}
                action={
                  user ? (
                    <Link href="/threads/new" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
                      Create thread
                    </Link>
                  ) : null
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 px-4 sm:px-5 dark:divide-slate-800">
              {threads.map((thread) => (
                <li key={thread.id}>
                  <ThreadRow thread={thread} showBoard />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}