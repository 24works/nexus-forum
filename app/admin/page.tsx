import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  FlagIcon,
  GaugeIcon,
  LayoutGridIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  ShieldXIcon,
  UsersIcon,
} from "lucide-react";
import { PublicUser } from "@/lib/types";
import { currentUserRSC } from "@/lib/session-rsc";
import { itemsPerPage } from "@/lib/settings";
import {
  adminOverview,
  adminReports,
  adminUsers,
  adminAudit,
  listBoards,
} from "@/lib/queries";
import { ReportActions, UserActions, BoardCreateForm, BoardRowActions } from "@/components/admin-actions";
import { ForumPagination } from "@/components/forum-pagination";
import { EmptyState } from "@/components/empty-state";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Stat } from "@/components/stat";
import { UserAvatar } from "@/components/user-avatar";
import { RoleBadge } from "@/components/role-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { RelativeTime } from "@/components/time";

export const metadata: Metadata = { title: "Moderation" };
export const dynamic = "force-dynamic";

type Tab = "overview" | "reports" | "users" | "boards" | "audit";

const TABS: { id: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { id: "overview", label: "Overview", icon: <GaugeIcon /> },
  { id: "reports", label: "Reports", icon: <FlagIcon /> },
  { id: "users", label: "Users", icon: <UsersIcon /> },
  { id: "boards", label: "Categories", icon: <LayoutGridIcon />, adminOnly: true },
  { id: "audit", label: "Audit log", icon: <ScrollTextIcon /> },
];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string; q?: string }>;
}) {
  const user = await currentUserRSC();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin" && user.role !== "moderator") {
    // Members reach this page mostly via the footer link — show a friendly
    // denial (with a way out) instead of the bare 404.
    return <AccessDenied username={user.username} />;
  }

  const sp = await searchParams;
  const requested = (sp.tab ?? "overview") as Tab;
  const tab: Tab = TABS.some((t) => t.id === requested && !(t.adminOnly && user.role !== "admin"))
    ? requested
    : "overview";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const perPage = itemsPerPage();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <ShieldCheckIcon className="size-6" /> Moderation
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage reports, members and categories.</p>
        </div>
        <Badge variant={user.role === "admin" ? "default" : "secondary"}>Signed in as {user.role}</Badge>
      </div>

      <nav className="flex flex-wrap gap-1.5 rounded-xl border bg-card p-1.5">
        {TABS.filter((t) => !t.adminOnly || user.role === "admin").map((t) => (
          <Button
            key={t.id}
            asChild
            size="sm"
            variant={tab === t.id ? "default" : "ghost"}
            className={cn(tab !== t.id && "text-muted-foreground")}
          >
            <Link href={`/admin?tab=${t.id}`}>
              <span className="[&>svg]:size-3.5">{t.icon}</span>
              {t.label}
            </Link>
          </Button>
        ))}
      </nav>

      {tab === "overview" && <Overview viewerRole={user.role} />}
      {tab === "reports" && <Reports page={page} perPage={perPage} />}
      {tab === "users" && <Users page={page} perPage={perPage} search={sp.q} viewerRole={user.role} viewerId={user.id} />}
      {tab === "boards" && user.role === "admin" && <Boards viewer={user} />}
      {tab === "audit" && <Audit page={page} perPage={perPage} />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function AccessDenied({ username }: { username: string }) {
  return (
    <div className="mx-auto w-full max-w-md pt-10">
      <Card className="py-12">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldXIcon />
            </EmptyMedia>
            <EmptyTitle>No access to the moderation dashboard</EmptyTitle>
            <EmptyDescription>
              This area is only available to moderators and administrators. If you believe you should have access,
              please contact the site administrators.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row items-center justify-center gap-2">
            <Button asChild>
              <Link href="/">Back to the forum</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/u/${username}`}>Your profile</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------

async function Overview({ viewerRole }: { viewerRole: "admin" | "moderator" }) {
  const stats = await adminOverview();
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Users" value={stats.users.toLocaleString()} />
        <Stat label="Threads" value={stats.threads.toLocaleString()} />
        <Stat label="Posts" value={stats.posts.toLocaleString()} />
        <Stat label="New (7d)" value={stats.newUsers7d.toLocaleString()} />
        <Stat label="Banned" value={stats.bannedUsers.toLocaleString()} />
        <Stat label="Open reports" value={stats.openReports.toLocaleString()} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin?tab=reports">
              Review {stats.openReports} open report{stats.openReports === 1 ? "" : "s"}
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin?tab=users">Manage users</Link>
          </Button>
          {viewerRole === "admin" && (
            <Button asChild variant="secondary" size="sm">
              <Link href="/admin?tab=boards">Manage categories</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------

async function Reports({ page, perPage }: { page: number; perPage: number }) {
  const data = await adminReports(page, perPage);
  return (
    <div className="flex flex-col gap-4">
      {data.items.length === 0 ? (
        <Card className="py-10">
          <EmptyState
            title="No reports"
            description="Reported posts from the community will show up here."
            icon={<FlagIcon />}
          />
        </Card>
      ) : (
        <Card className="py-0">
          <ul>
            {data.items.map((r, idx) => (
              <li key={r.id}>
                {idx > 0 && <Separator />}
                <div className="flex flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={r.status === "open" ? "default" : r.status === "resolved" ? "secondary" : "outline"}>
                      {r.status}
                    </Badge>
                    <span>
                      Reported by{" "}
                      <strong className="font-medium text-foreground">{r.reporter_username ?? "unknown"}</strong>
                    </span>
                    <RelativeTime ts={r.created_at} />
                  </div>
                  <p className="text-sm">“{r.reason}”</p>
                  <p className="text-xs text-muted-foreground">
                    Post #{r.post_id}
                    {r.post_author_username ? <> by {r.post_author_username}</> : null}
                    {r.thread_title ? (
                      <>
                        {" "}
                        in{" "}
                        <Link
                          href={`/t/${r.thread_id}?page=1#post-${r.post_id}`}
                          className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
                        >
                          {r.thread_title}
                        </Link>
                      </>
                    ) : null}
                  </p>
                  {r.post_preview && (
                    <p className="line-clamp-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                      {r.post_preview}
                    </p>
                  )}
                  <ReportActions reportId={r.id} status={r.status} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <ForumPagination page={data.page} totalPages={data.totalPages} buildHref={(p) => `/admin?tab=reports&page=${p}`} />
    </div>
  );
}

// ---------------------------------------------------------------------------

async function Users({
  page,
  perPage,
  search,
  viewerRole,
  viewerId,
}: {
  page: number;
  perPage: number;
  search?: string;
  viewerRole: "admin" | "moderator";
  viewerId: number;
}) {
  const data = await adminUsers({ page, perPage, search });
  return (
    <div className="flex flex-col gap-4">
      <Card className="py-0">
        <ul>
          {data.items.map((u, idx) => (
            <li key={u.id}>
              {idx > 0 && <Separator />}
              <div className="flex flex-wrap items-center gap-3 p-4">
                <UserAvatar name={u.username} />
                <div className="min-w-40 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/u/${u.username}`} className="font-medium hover:underline">
                      {u.username}
                    </Link>
                    <RoleBadge role={u.role} />
                    {u.status === "banned" && <Badge variant="destructive">Banned</Badge>}
                    {u.email && !u.email_verified && <Badge variant="outline">Unverified email</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {u.post_count} posts · {u.thread_count} threads · joined <RelativeTime ts={u.created_at} />
                    {u.email ? ` · ${u.email}` : ""}
                  </p>
                  {u.ban_reason && <p className="mt-0.5 text-xs text-destructive">Reason: {u.ban_reason}</p>}
                </div>
                <UserActions
                  userId={u.id}
                  status={u.status}
                  role={u.role}
                  viewerRole={viewerRole}
                  isSelf={u.id === viewerId}
                />
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <ForumPagination page={data.page} totalPages={data.totalPages} buildHref={(p) => `/admin?tab=users&page=${p}`} />
    </div>
  );
}

// ---------------------------------------------------------------------------

async function Boards({ viewer }: { viewer: PublicUser }) {
  const boards = await listBoards(viewer);
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Create a category</CardTitle>
        </CardHeader>
        <CardContent>
          <BoardCreateForm />
        </CardContent>
      </Card>
      <Card className="py-0">
        <ul>
          {boards.map((b, idx) => (
            <li key={b.id}>
              {idx > 0 && <Separator />}
              <div className="flex flex-col p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/board/${b.slug}`} className="font-medium hover:underline">
                    {b.name}
                  </Link>
                  <Badge variant="outline">/{b.slug}</Badge>
                  <Badge variant={b.role === "everyone" ? "secondary" : "outline"}>{b.role}</Badge>
                  {b.is_enabled === 0 && <Badge variant="destructive">Hidden</Badge>}
                  <span className="text-xs text-muted-foreground">
                    position {b.position} · {b.thread_count} threads · {b.post_count} posts
                  </span>
                </div>
                {b.description && <p className="mt-1 text-xs text-muted-foreground">{b.description}</p>}
                <BoardRowActions
                  boardId={b.id}
                  isEnabled={b.is_enabled === 1}
                  role={b.role}
                  position={b.position}
                  name={b.name}
                  description={b.description}
                />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------

async function Audit({ page, perPage }: { page: number; perPage: number }) {
  const data = await adminAudit(page, perPage);
  return (
    <div className="flex flex-col gap-4">
      {data.items.length === 0 ? (
        <Card className="py-10">
          <EmptyState title="No audit entries yet" icon={<ScrollTextIcon />} />
        </Card>
      ) : (
        <Card className="py-0">
          <ul className="font-mono text-xs">
            {data.items.map((a, idx) => (
              <li key={a.id}>
                {idx > 0 && <Separator />}
                <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                  <span className="text-muted-foreground">
                    <RelativeTime ts={a.created_at} />
                  </span>
                  <span className="font-semibold text-foreground">{a.action}</span>
                  <span className="text-muted-foreground">
                    by {a.actor_username ?? "system"} → {a.target_type}#{a.target_id}
                  </span>
                  {a.details && <span className="truncate text-muted-foreground">{a.details}</span>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <ForumPagination page={data.page} totalPages={data.totalPages} buildHref={(p) => `/admin?tab=audit&page=${p}`} />
    </div>
  );
}
