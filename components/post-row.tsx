import Link from "next/link";
import { QuoteIcon } from "lucide-react";
import { PostView } from "@/lib/queries";
import { PublicUser } from "@/lib/types";
import { canModerate } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/role-badge";
import { UserAvatar } from "@/components/user-avatar";
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
    <article id={`post-${post.id}`} className="grid grid-cols-1 sm:grid-cols-[170px_1fr]">
      {/* Author column */}
      <div className="flex items-center gap-3 bg-muted/40 p-4 sm:flex-col sm:items-start sm:gap-2 sm:border-r">
        <Link href={`/u/${authorName}`} className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-2">
          <UserAvatar name={authorName} size={48} />
          <span className="font-semibold hover:underline">{authorName}</span>
        </Link>
        <div className="flex flex-col items-start gap-1 sm:items-center">
          {post.author_role ? <RoleBadge role={post.author_role as never} /> : <Badge variant="outline">Guest</Badge>}
          {post.author_status === "banned" && <Badge variant="destructive">Banned</Badge>}
          {isDeleted && <Badge variant="destructive">Removed</Badge>}
        </div>
        <div className="hidden text-center text-[11px] leading-5 text-muted-foreground sm:block">
          Joined <FormattedDate ts={post.author_created_at ?? post.created_at} /> ·
          <br />
          {pluralize(post.author_post_count ?? 0, "post", "posts")}
        </div>
      </div>

      {/* Content column */}
      <div className="px-4 py-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span>Post #{number}</span>
            <span>·</span>
            <a href={`#post-${post.id}`} className="hover:text-foreground">
              <FormattedDate ts={post.created_at} />
            </a>
          </span>
          <div className="flex items-center gap-1">
            {signedIn && !isDeleted && !isOp && (
              <Button asChild variant="ghost" size="xs" className="text-muted-foreground">
                <Link href={`/t/${threadId}?quote=${post.id}`}>
                  <QuoteIcon data-icon="inline-start" />
                  Quote
                </Link>
              </Button>
            )}
          </div>
        </div>

        {isDeleted ? (
          <p className="rounded-lg border border-dashed py-4 text-center text-sm italic text-muted-foreground">
            This post was removed by a moderator or its author.
          </p>
        ) : (
          <>
            <PostContent html={post.content_html} />
            {post.edit_count > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Last edited {post.updated_at ? <FormattedDate ts={post.updated_at} /> : ""} ({post.edit_count}{" "}
                {post.edit_count === 1 ? "edit" : "edits"})
              </p>
            )}
            {/* The OP actions hide entirely for non-owner/non-mod viewers,
                so only draw the divider when an action row will render. */}
            {signedIn && (!isOp || isAuthor || isMod) && (
              <div className="mt-3 border-t pt-2">
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
    </article>
  );
}
