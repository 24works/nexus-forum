import Link from "next/link";
import { Bell, Clapperboard, LayoutGrid, Search, Shield, UserRound } from "lucide-react";
import { forumName } from "@/lib/settings";
import { PublicUser } from "@/lib/types";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, Badge, cn } from "@/components/ui";
import { api } from "@/lib/api-client";

export function Header({
  user,
  unread,
  theme,
}: {
  user: PublicUser | null;
  unread: number | null;
  theme: "light" | "dark";
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white dark:bg-indigo-500">
            <Clapperboard className="size-4.5" />
          </span>
          <span className="hidden text-base font-semibold tracking-tight text-slate-900 sm:block dark:text-white">
            {forumName()}
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          <HeaderLink href="/" icon={<LayoutGrid className="size-4" />} label="Boards" />
          <HeaderLink href="/search" icon={<Search className="size-4" />} label="Search" />
          {user?.role === "admin" && (
            <HeaderLink href="/admin" icon={<Shield className="size-4" />} label="Admin" />
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <HeaderIconLink href="/search" ariaLabel="Search" className="md:hidden">
            <Search className="size-5" />
          </HeaderIconLink>

          {user ? (
            <>
              <Link
                href="/notifications"
                aria-label="Notifications"
                className="relative inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <Bell className="size-5" />
                {unread && unread > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold text-white">
                    {unread > 99 ? "99+" : unread}
                  </span>
                ) : null}
              </Link>

              <div className="group relative">
                <button className="flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Avatar name={user.username} size={32} />
                </button>
                <div className="invisible absolute right-0 z-20 mt-1 w-56 translate-y-1 rounded-xl border border-slate-200 bg-white p-1.5 opacity-0 shadow-xl transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 dark:border-slate-800 dark:bg-slate-900">
                  <div className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={user.username} size={28} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {user.username}
                        </p>
                        <p className="text-xs capitalize text-slate-500 dark:text-slate-400">{user.role}</p>
                      </div>
                    </div>
                  </div>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <MenuLink href={`/u/${user.username}`} icon={<UserRound className="size-4" />} label="Profile" />
                  <MenuLink href="/me/settings" icon={<UserRound className="size-4" />} label="Settings" />
                  {user.role !== "member" && (
                    <MenuLink href="/admin" icon={<Shield className="size-4" />} label="Moderation" />
                  )}
                  <button
                    onClick={() => {
                      api("/api/auth/logout", { method: "POST" }).then(() => {
                        location.href = "/";
                      });
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
              >
                Register
              </Link>
            </div>
          )}

          <ThemeToggle initial={theme} />
        </div>
      </div>
    </header>
  );
}

function HeaderLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
    >
      {icon}
      {label}
    </Link>
  );
}

function HeaderIconLink({
  href,
  ariaLabel,
  className,
  children,
}: {
  href: string;
  ariaLabel: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
        className
      )}
    >
      {children}
    </Link>
  );
}

function MenuLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {icon}
      {label}
    </Link>
  );
}