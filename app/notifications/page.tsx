import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AtSignIcon, BellIcon, ReplyIcon } from "lucide-react";
import { currentUserRSC } from "@/lib/session-rsc";
import { itemsPerPage } from "@/lib/settings";
import { notificationsFor, postPageInThread } from "@/lib/queries";
import { NotificationRow } from "@/lib/types";
import { ForumPagination } from "@/components/forum-pagination";
import { EmptyState } from "@/components/empty-state";
import { UserAvatar } from "@/components/user-avatar";
import { MarkAllReadButton } from "@/components/notifications-read-button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { RelativeTime } from "@/components/time";

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
          <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
            <BellIcon className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
            <p className="text-sm text-muted-foreground">Replies to your threads and mentions.</p>
          </div>
        </div>
        {data.items.length > 0 && hasUnread && <MarkAllReadButton />}
      </div>

      {data.items.length === 0 ? (
        <Card className="py-10">
          <EmptyState
            title="No notifications yet"
            description="When someone replies to your thread or mentions you, it will show up here."
            icon={<BellIcon />}
          />
        </Card>
      ) : (
        <Card className="py-0">
          <ul>
            {data.items.map((n, idx) => (
              <li key={n.id}>
                {idx > 0 && <Separator />}
                <NotificationItem n={n} perPage={perPage} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ForumPagination page={data.page} totalPages={data.totalPages} buildHref={buildHref} />
    </div>
  );
}

async function NotificationItem({ n, perPage }: { n: NotificationRow; perPage: number }) {
  const actor = n.actor_username ?? "A deleted user";
  const isReply = n.type === "reply";
  const postPage = n.post_id ? await postPageInThread(n.post_id, perPage) : null;
  const threadHref = n.thread_id
    ? `/t/${n.thread_id}${n.post_id ? `?page=${postPage ?? 1}#post-${n.post_id}` : ""}`
    : null;

  return (
    <div className="flex items-start gap-3 p-4">
      <span
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          n.read === 1 ? "bg-muted-foreground/30" : "bg-primary"
        )}
        aria-label={n.read === 1 ? "Read" : "Unread"}
      />
      <UserAvatar name={actor} />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {n.actor_username ? (
            <Link
              href={`/u/${actor}`}
              className="font-semibold text-foreground hover:underline"
            >
              {actor}
            </Link>
          ) : (
            <span className="font-semibold text-foreground">{actor}</span>
          )}{" "}
          {isReply ? <>replied to your thread</> : <>mentioned you</>}
          {n.thread_id && n.thread_title && (
            <>
              {" "}
              {threadHref ? (
                <Link href={threadHref} className="font-medium text-foreground underline underline-offset-4 hover:no-underline">
                  {n.thread_title}
                </Link>
              ) : null}
            </>
          )}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          {isReply ? <ReplyIcon className="size-3" /> : <AtSignIcon className="size-3" />}
          <RelativeTime ts={n.created_at} />
        </p>
      </div>
    </div>
  );
}
