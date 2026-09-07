import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Reply, AtSign } from "lucide-react";
import { currentUserRSC } from "@/lib/session-rsc";
import { itemsPerPage } from "@/lib/settings";
import { notificationsFor } from "@/lib/queries";
import { NotificationRow } from "@/lib/types";
import { Avatar, Card, Pagination, EmptyState, cn } from "@/components/ui";
import { MarkAllReadButton } from "@/components/notifications-read-button";
import { relativeTime } from "@/lib/time";

export const metadata: Metadata = { title: "Notifications" };

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await currentUserRSC();
  if (!user) redirect("/login?next=/notifications");

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const perPage = itemsPerPage();
  const data = await notificationsFor(user.id, page, perPage);
  const hasUnread = data.items.some((n) => n.read === 0);

  const buildHref = (p: number) => `/notifications?page=${p}`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Bell className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Notifications</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Replies to your threads and mentions.
            </p>
          </div>
        </div>
        {data.items.length > 0 && hasUnread && <MarkAllReadButton />}
      </div>

      {data.items.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          description="When someone replies to your thread or mentions you, it will show up here."
          icon={<Bell className="size-8" />}
        />
      ) : (
        <Card noPad>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.items.map((n) => (
              <NotificationItem key={n.id} n={n} />
            ))}
          </ul>
        </Card>
      )}

      <Pagination page={data.page} totalPages={data.totalPages} buildHref={buildHref} />
    </div>
  );
}

function NotificationItem({ n }: { n: NotificationRow }) {
  const actor = n.actor_username ?? "A deleted user";
  const isReply = n.type === "reply";
  const threadHref = n.thread_id
    ? `/t/${n.thread_id}${n.post_id ? `?page=1#post-${n.post_id}` : ""}`
    : null;

  return (
    <li className="flex items-start gap-3 px-4 py-3 sm:px-5">
      <span
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          n.read === 1 ? "bg-slate-300 dark:bg-slate-700" : "bg-indigo-500"
        )}
        aria-label={n.read === 1 ? "Read" : "Unread"}
      />
      <Avatar name={actor} size={36} className="rounded-full" />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {n.actor_username ? (
            <Link
              href={`/u/${actor}`}
              className="font-semibold text-slate-900 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
            >
              {actor}
            </Link>
          ) : (
            <span className="font-semibold text-slate-900 dark:text-slate-100">{actor}</span>
          )}{" "}
          {isReply ? (
            <>
              replied to your thread
            </>
          ) : (
            <>
              mentioned you
            </>
          )}
          {n.thread_id && n.thread_title && (
            <>
              {" "}
              {threadHref ? (
                <Link
                  href={threadHref}
                  className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {n.thread_title}
                </Link>
              ) : null}
            </>
          )}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
          {isReply ? <Reply className="size-3" /> : <AtSign className="size-3" />}
          {relativeTime(n.created_at)}
        </p>
      </div>
    </li>
  );
}