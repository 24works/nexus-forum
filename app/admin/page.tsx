import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Flag,
  Users as UsersIcon,
  LayoutGrid,
  ScrollText,
  Gauge,
  ShieldCheck,
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
import { Card, Badge, RoleBadge, Pagination, EmptyState, Avatar, Stat } from "@/components/ui";
import { RelativeTime } from "@/components/time";

export const metadata: Metadata = { title: "Moderation" };
export const dynamic = "force-dynamic";

type Tab = "overview" | "reports" | "users" | "boards" | "audit";

const TABS: { id: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { id: "overview", label: "Overview", icon: <Gauge className="size-4" /> },
  { id: "reports", label: "Reports", icon: <Flag className="size-4" /> },
  { id: "users", label: "Users", icon: <UsersIcon className="size-4" /> },
  { id: "boards", label: "Categories", icon: <LayoutGrid className="size-4" />, adminOnly: true },
  { id: "audit", label: "Audit log", icon: <ScrollText className="size-4" /> },
];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string; q?: string }>;
}) {
  const user = await currentUserRSC();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin" && user.role !== "moderator") notFound();

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
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
            <ShieldCheck className="size-6 text-indigo-600 dark:text-indigo-400" /> Moderation
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage reports, members and categories.
          </p>
        </div>
        <Badge color={user.role === "admin" ? "rose" : "emerald"}>
          Signed in as {user.role}
        </Badge>
      </div>

      <nav className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900">
        {TABS.filter((t) => !t.adminOnly || user.role === "admin").map((t) => (
          <Link
            key={t.id}
            href={`/admin?tab=${t.id}`}
            className={
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
              (tab === t.id
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")
            }
          >
            {t.icon}
            {t.label}
          </Link>
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
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Quick actions</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/admin?tab=reports"
            className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Review {stats.openReports} open report{stats.openReports === 1 ? "" : "s"}
          </Link>
          <Link
            href="/admin?tab=users"
            className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Manage users
          </Link>
          {viewerRole === "admin" && (
            <Link
              href="/admin?tab=boards"
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Manage categories
            </Link>
          )}
        </div>
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
        <EmptyState
          title="No reports"
          description="Reported posts from the community will show up here."
          icon={<Flag className="size-8" />}
        />
      ) : (
        <Card noPad>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.items.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Badge color={r.status === "open" ? "amber" : r.status === "resolved" ? "emerald" : "slate"}>
                    {r.status}
                  </Badge>
                  <span>
                    Reported by <strong className="text-slate-700 dark:text-slate-200">{r.reporter_username ?? "unknown"}</strong>
                  </span>
                  <RelativeTime ts={r.created_at} />
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-100">“{r.reason}”</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Post #{r.post_id}
                  {r.post_author_username ? <> by {r.post_author_username}</> : null}
                  {r.thread_title ? (
                    <>
                      {" "}in{" "}
                      <Link href={`/t/${r.thread_id}?page=1#post-${r.post_id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                        {r.thread_title}
                      </Link>
                    </>
                  ) : null}
                </p>
                {r.post_preview && (
                  <p className="line-clamp-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                    {r.post_preview}
                  </p>
                )}
                <ReportActions reportId={r.id} status={r.status} />
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Pagination
        page={data.page}
        totalPages={data.totalPages}
        buildHref={(p) => `/admin?tab=reports&page=${p}`}
      />
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
      <Card noPad>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.items.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 p-4">
              <Avatar name={u.username} size={36} />
              <div className="min-w-40 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/u/${u.username}`} className="font-medium text-slate-900 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400">
                    {u.username}
                  </Link>
                  <RoleBadge role={u.role} />
                  {u.status === "banned" && <Badge color="rose">Banned</Badge>}
                  {u.email && !u.email_verified && <Badge color="amber">Unverified email</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  {u.post_count} posts · {u.thread_count} threads · joined <RelativeTime ts={u.created_at} />
                  {u.email ? ` · ${u.email}` : ""}
                </p>
                {u.ban_reason && <p className="mt-0.5 text-xs text-rose-500">Reason: {u.ban_reason}</p>}
              </div>
              <UserActions
                userId={u.id}
                status={u.status}
                role={u.role}
                viewerRole={viewerRole}
                isSelf={u.id === viewerId}
              />
            </li>
          ))}
        </ul>
      </Card>
      <Pagination page={data.page} totalPages={data.totalPages} buildHref={(p) => `/admin?tab=users&page=${p}`} />
    </div>
  );
}

// ---------------------------------------------------------------------------

async function Boards({ viewer }: { viewer: PublicUser }) {
  const boards = await listBoards(viewer);
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Create a category</h2>
        <BoardCreateForm />
      </Card>
      <Card noPad>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {boards.map((b) => (
            <li key={b.id} className="flex flex-col p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/board/${b.slug}`} className="font-medium text-slate-900 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400">
                  {b.name}
                </Link>
                <Badge color="slate">/{b.slug}</Badge>
                <Badge color={b.role === "everyone" ? "emerald" : "amber"}>{b.role}</Badge>
                {b.is_enabled === 0 && <Badge color="rose">Hidden</Badge>}
                <span className="text-xs text-slate-400">
                  position {b.position} · {b.thread_count} threads · {b.post_count} posts
                </span>
              </div>
              {b.description && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{b.description}</p>}
              <BoardRowActions
                boardId={b.id}
                isEnabled={b.is_enabled === 1}
                role={b.role}
                position={b.position}
                name={b.name}
                description={b.description}
              />
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
        <EmptyState title="No audit entries yet" icon={<ScrollText className="size-8" />} />
      ) : (
        <Card noPad>
          <ul className="divide-y divide-slate-100 font-mono text-xs dark:divide-slate-800">
            {data.items.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <span className="text-slate-400">
                  <RelativeTime ts={a.created_at} />
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{a.action}</span>
                <span className="text-slate-500 dark:text-slate-400">
                  by {a.actor_username ?? "system"} → {a.target_type}#{a.target_id}
                </span>
                {a.details && <span className="truncate text-slate-400">{a.details}</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Pagination page={data.page} totalPages={data.totalPages} buildHref={(p) => `/admin?tab=audit&page=${p}`} />
    </div>
  );
}
