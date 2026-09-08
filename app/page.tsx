import Link from "next/link";
import { MessageSquareIcon } from "lucide-react";
import { currentUserRSC } from "@/lib/session-rsc";
import { forumName } from "@/lib/settings";
import { listBoards, latestThreads, siteStats } from "@/lib/queries";
import { SearchBox } from "@/components/search-box";
import { BoardCard } from "@/components/board-card";
import { ThreadRow } from "@/components/thread-row";
import { Stat } from "@/components/stat";
import { SectionHeading } from "@/components/section-heading";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { pluralize } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await currentUserRSC();
  const [boards, threads, stats] = await Promise.all([listBoards(user), latestThreads(8), siteStats()]);

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-primary px-6 py-12 text-primary-foreground sm:px-10">
        <div className="absolute -right-20 -top-20 size-64 rounded-full bg-background/10 blur-2xl" />
        <div className="absolute -bottom-24 right-32 size-72 rounded-full bg-background/5 blur-3xl" />
        <div className="relative flex flex-col items-start gap-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{forumName()}</h1>
          <p className="max-w-xl text-sm leading-6 text-primary-foreground/80">
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
          <Card className="py-10">
            <EmptyState
              title="No categories yet"
              description="An administrator needs to create the first category."
            />
          </Card>
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
        <Card className="py-2">
          {threads.length === 0 ? (
            <EmptyState
              title="No threads yet"
              description="Start the conversation by creating the first thread."
              icon={<MessageSquareIcon />}
              action={
                user ? (
                  <Button asChild>
                    <Link href="/threads/new">Create thread</Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="px-2">
              {threads.map((thread, idx) => (
                <li key={thread.id}>
                  {idx > 0 && <Separator />}
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
