"use client";

/**
 * Client island for the signed-in header menu. The surrounding Header is a
 * server component, so event handlers (e.g. the sign-out button) must live
 * inside a "use client" boundary.
 */

import { BellIcon, LogOutIcon, ShieldIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";
import { PublicUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import { api } from "@/lib/api-client";

export function UserMenu({ user, unread }: { user: PublicUser; unread: number | null }) {
  const signOut = async () => {
    await api("/api/auth/logout", { method: "POST" });
    location.href = "/";
  };

  return (
    <>
      <Button asChild variant="ghost" size="icon-sm" aria-label="Notifications" className="relative">
        <Link href="/notifications">
          <BellIcon />
          {unread && unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Link>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Account menu" className="rounded-full">
            <UserAvatar name={user.username} size="default" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex items-center gap-2">
              <UserAvatar name={user.username} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.username}</p>
                <p className="text-xs capitalize text-muted-foreground">{user.role}</p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href={`/u/${user.username}`}>
                <UserRoundIcon />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/me/settings">
                <UserRoundIcon />
                Settings
              </Link>
            </DropdownMenuItem>
            {user.role !== "member" && (
              <DropdownMenuItem asChild>
                <Link href="/admin">
                  <ShieldIcon />
                  Moderation
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={signOut}>
              <LogOutIcon />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
