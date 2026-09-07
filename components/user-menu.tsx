"use client";

/**
 * Client island for the signed-in header menu. The surrounding Header is a
 * server component, so event handlers (e.g. the sign-out button) must live
 * inside a "use client" boundary.
 */

import { Bell, Shield, UserRound } from "lucide-react";
import Link from "next/link";
import { PublicUser } from "@/lib/types";
import { Avatar } from "@/components/ui";
import { api } from "@/lib/api-client";

export function UserMenu({ user, unread }: { user: PublicUser; unread: number | null }) {
  return (
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
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Account menu"
        >
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
            type="button"
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
