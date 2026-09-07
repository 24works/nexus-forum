import Link from "next/link";
import { Quote } from "lucide-react";
import { PostView } from "@/lib/queries";
import { PublicUser } from "@/lib/types";
import { canModerate } from "@/lib/auth";
import { Avatar, Badge, RoleBadge } from "@/components/ui";
import { PostContent } from "@/components/post-content";
import { PostActions } from "@/components/post-actions";
import { ThreadOpActions } from "@/components/thread-op-actions";
import { FormattedDate } from "@/components/time";
import { pluralize } from "@/lib/time";

export function PostRow({
  post,
  threadId,
  currentUser,
  boardSlug,
  number,
  isOp = false,
  opTags,
}: {
  post: PostView;
  threadId: number;
  currentUser: PublicUser | null;
  boardSlug: string;
  number: number;
  /** True when this row renders the thread's own first post (not a `posts` row). */
  isOp?: boolean;
  opTags?: string;
}) {
  const isAuthor = Boolean(currentUser && currentUser.id === post.user_id);
  const isMod = canModerate(currentUser);
  const isDeleted = post.is_deleted === 1;
  const authorName = post.author_username ?? "Deleted user";
  const signedIn = Boolean(currentUser);

  return (
    <div
      id={`post-${post.id}`}
      className="grid grid-cols-1 sm:grid-cols-[170px_1fr]"
    >
      {/* Author column */}
      <div className="flex items-center gap-3 rounded-t-2xl border-b border-slate-100 bg-slate-50/60 p-4 sm:flex-col sm:items-start sm:gap-2 sm:rounded-none sm:rounded-l-2xl sm:border-b-0 sm:border-r sm:border-slate-100 dark:border-slate-800 dark:bg-slate-900/40">
        <Link href={`/u/${authorName}`} className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-2">
          <Avatar name={authorName} size={48} />
          <span className="font-semibold text-slate-900 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400">
            {authorName}
          </span>
        </Link>
        <div className="flex flex-col items-start gap-1 sm:items-center">
          {post.author_role ? <RoleBadge role={post.author_role as never} /> : <Badge color="slate">Guest</Badge>}
          {post.author_status === "banned" && <Badge color="rose">Banned</Badge>}
          {isDeleted && <Badge color="rose">Removed</Badge>}
        </div>
        <div className="hidden text-center text-[11px] leading-5 text-slate-400 sm:block">
          Joined <FormattedDate ts={post.author_created_at ?? post.created_at} /> ·
          <br />
          {pluralize(post.author_post_count ?? 0, "post", "posts")}
        </div>
      </div>

      {/* Content column */}
      <div className="rounded-r-2xl border-b border-slate-100 px-4 py-4 dark:border-slate-800">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-xs text-slate-400">
            <span>Post #{number}</span>
            <span>·</span>
            <a href={`#post-${post.id}`} className="hover:text-slate-600 dark:hover:text-slate-200">
              <FormattedDate ts={post.created_at} />
            </a>
          </span>
          <div className="flex items-center gap-1">
            {signedIn && !isDeleted && !isOp && (
              <Link
                href={`/t/${threadId}?quote=${post.id}`}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <Quote className="size-3.5" /> Quote
              </Link>
            )}
          </div>
        </div>

        {isDeleted ? (
          <p className="rounded-xl border border-dashed border-slate-200 py-4 text-center text-sm italic text-slate-400 dark:border-slate-700">
            This post was removed by a moderator or its author.
          </p>
        ) : (
          <>
            <PostContent html={post.content_html} />
            {post.edit_count > 0 && (
              <p className="mt-2 text-[11px] text-slate-400">
                Last edited {post.updated_at ? <FormattedDate ts={post.updated_at} /> : ""} ({post.edit_count}{" "}
                {post.edit_count === 1 ? "edit" : "edits"})
              </p>
            )}
            {signedIn && (
              <div className="mt-3 border-t border-slate-100 pt-2 dark:border-slate-800">
                {isOp ? (
                  <ThreadOpActions
                    threadId={threadId}
                    boardSlug={boardSlug}
                    isOwner={isAuthor}
                    isModerator={isMod}
                    initialTitle={post.thread_title ?? ""}
                    initialContent={post.content}
                    initialTags={opTags ?? ""}
                  />
                ) : (
                  <PostActions
                    key={post.updated_at ?? 0}
                    postId={post.id}
                    threadId={threadId}
                    isOwner={isAuthor}
                    isModerator={isMod}
                    initialContent={post.content}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}