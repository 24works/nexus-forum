import Link from "next/link";
import { LockIcon, MegaphoneIcon, MessageSquareIcon, PinIcon } from "lucide-react";
import { pluralize } from "@/lib/time";
import { ThreadView } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { RelativeTime } from "@/components/time";

export function ThreadRow({
  thread,
  showBoard = false,
  showAuthor = false,
}: {
  thread: ThreadView;
  showBoard?: boolean;
  showAuthor?: boolean;
}) {
  const lastBy = thread.last_reply_username;
  const href = `/t/${thread.id}`;

  return (
    // The whole row is a single link. Inner title/board-links are plain spans:
    // HTML forbids nesting <a> inside <a>, which would break hydration.
    <Link href={href} className="group block rounded-lg transition-colors hover:bg-muted/50">
      <div className="flex items-start gap-4 px-2 py-3">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
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
          </div>

          <span
            className={cn(
              "line-clamp-1 font-medium transition-colors group-hover:underline",
              thread.is_locked === 1 && "opacity-80"
            )}
          >
            {thread.title}
          </span>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {showBoard && thread.board_name && <Badge variant="outline">{thread.board_name}</Badge>}
            <span className="inline-flex items-center gap-1">
              <UserAvatar name={thread.author_username ?? "?"} size="sm" />
              {thread.author_username ?? "Unknown"}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquareIcon className="size-3.5" />
              {pluralize(thread.reply_count, "reply", "replies")}
            </span>
            <span>{thread.views.toLocaleString()} views</span>
            <RelativeTime ts={thread.created_at} />

            {thread.tags
              .split(",")
              .filter(Boolean)
              .slice(0, 3)
              .map((tag) => (
                <Badge key={tag} variant="secondary">
                  #{tag}
                </Badge>
              ))}

            {showBoard && thread.last_reply_at ? (
              <span className="inline-flex items-center gap-1">
                <UserAvatar name={lastBy ?? "?"} size="sm" />
                <RelativeTime ts={thread.last_reply_at} />
              </span>
            ) : null}
          </div>
        </div>

        {thread.last_reply_at ? (
          <div className="hidden w-36 shrink-0 flex-col items-end gap-0.5 text-xs text-muted-foreground sm:flex">
            <RelativeTime ts={thread.last_reply_at} />
            {showBoard && (
              <span className="inline-flex items-center gap-1">
                <UserAvatar name={lastBy ?? "?"} size="sm" />
                {lastBy}
              </span>
            )}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
