import Link from "next/link";
import { MessageSquareIcon, MessagesSquareIcon } from "lucide-react";
import { pluralize } from "@/lib/time";
import { BoardRow } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/user-avatar";
import { RelativeTime } from "@/components/time";

export function BoardCard({ board }: { board: BoardRow }) {
  return (
    <Link href={`/board/${board.slug}`} className="group block rounded-xl">
      <Card className="h-full gap-3 py-4 transition-colors group-hover:border-ring/60 group-hover:shadow-md">
        <CardContent className="flex flex-col gap-3 px-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <MessagesSquareIcon className="size-4.5" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate font-semibold transition-colors group-hover:underline">{board.name}</h3>
              <p className="truncate text-xs text-muted-foreground">{board.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MessagesSquareIcon className="size-3.5" />
              {pluralize(board.thread_count, "thread")}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquareIcon className="size-3.5" />
              {pluralize(board.post_count, "post")}
            </span>
          </div>

          <Separator />
          {board.last_thread_title ? (
            <>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="line-clamp-1 font-medium">{board.last_thread_title}</span>
                <span className="shrink-0 text-muted-foreground">
                  <RelativeTime ts={board.last_post_created_at} />
                </span>
              </div>
              <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <UserAvatar name={board.last_post_username ?? "?"} size="sm" />
                Latest by {board.last_post_username ?? "—"}
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground">No threads yet — be the first!</div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
