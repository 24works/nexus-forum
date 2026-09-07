import Link from "next/link";
import { MessageSquare, FileText, Album } from "lucide-react";
import { relativeTime, pluralize } from "@/lib/time";
import { BoardRow } from "@/lib/types";
import { Card } from "@/components/ui";

export function BoardCard({ board }: { board: BoardRow }) {
  return (
    <Link href={`/board/${board.slug}`} className="group block rounded-2xl">
      <Card className="h-full transition-colors group-hover:border-indigo-400/60 group-hover:shadow-md dark:group-hover:border-indigo-500/40">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Album className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
                {board.name}
              </h3>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{board.description}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <FileText className="size-3.5" />
            {pluralize(board.thread_count, "thread")}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3.5" />
            {pluralize(board.post_count, "post")}
          </span>
        </div>

        {board.last_thread_title ? (
          <div className="mt-3 border-t border-slate-100 pt-2.5 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="line-clamp-1 font-medium text-slate-700 group-hover:text-indigo-600 dark:text-slate-200 dark:group-hover:text-indigo-400">
                {board.last_thread_title}
              </span>
              <span className="shrink-0 text-slate-400">{relativeTime(board.last_post_created_at)}</span>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">Latest by {board.last_post_username ?? "—"}</div>
          </div>
        ) : (
          <div className="mt-3 border-t border-slate-100 pt-2.5 text-xs text-slate-400 dark:border-slate-800">
            No threads yet — be the first!
          </div>
        )}
      </Card>
    </Link>
  );
}