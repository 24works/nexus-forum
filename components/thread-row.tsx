import Link from "next/link";
import { MessageSquare, Pin, Megaphone, Lock, Eye, User2 } from "lucide-react";
import { pluralize } from "@/lib/time";
import { ThreadView } from "@/lib/queries";
import { Badge, Avatar, cn } from "@/components/ui";
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
    <Link href={href} className="group block">
      <div className="flex items-start gap-4 py-3">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
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
          </div>

          <span
            className={cn(
              "line-clamp-1 font-medium text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400",
              thread.is_locked === 1 ? "opacity-80" : undefined
            )}
          >
            {thread.title}
          </span>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            {showBoard && (
              <span className="inline-flex items-center gap-1">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {thread.board_name}
                </span>
              </span>
            )}
            {showAuthor && (
              <span className="inline-flex items-center gap-1">
                <User2 className="size-3" />
                <span className="hover:underline">{thread.author_username}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <User2 className="size-3" />
              {thread.author_username}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="size-3.5" />
              {thread.views}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="size-3.5" />
              {thread.reply_count}
            </span>
            <RelativeTime ts={thread.created_at} />

            {thread.tags
              .split(",")
              .filter(Boolean)
              .slice(0, 3)
              .map((tag) => (
                <Badge key={tag} color="violet">
                  #{tag}
                </Badge>
              ))}

            {showBoard && thread.last_reply_at ? (
              <span className="inline-flex items-center gap-1">
                <Avatar name={lastBy ?? "?"} size={16} className="rounded-full" />
                <RelativeTime ts={thread.last_reply_at} />
              </span>
            ) : null}
          </div>
        </div>

        {thread.last_reply_at ? (
          <div className="hidden w-40 flex-col items-end gap-0.5 sm:flex">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              <RelativeTime ts={thread.last_reply_at} />
            </span>
            {showBoard && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Avatar name={lastBy ?? "?"} size={18} className="rounded-full" />
                {lastBy}
              </span>
            )}
          </div>
        ) : null}
      </div>
    </Link>
  );
}