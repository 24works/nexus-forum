import Link from "next/link";
import { LayoutGridIcon, SearchIcon, ShieldIcon } from "lucide-react";
import { forumName } from "@/lib/settings";
import { PublicUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

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
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" />
              <path d="m6.2 5.3 3.1 3.9" />
              <path d="m12.4 3.4 3.1 4" />
              <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
            </svg>
          </span>
          <span className="hidden text-base font-semibold tracking-tight sm:block">{forumName()}</span>
        </Link>

        <nav className="ml-3 hidden items-center gap-1 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <LayoutGridIcon data-icon="inline-start" />
              Boards
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/search">
              <SearchIcon data-icon="inline-start" />
              Search
            </Link>
          </Button>
          {(user?.role === "admin" || user?.role === "moderator") && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">
                <ShieldIcon data-icon="inline-start" />
                Admin
              </Link>
            </Button>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Button asChild variant="ghost" size="icon-sm" className="md:hidden" aria-label="Search">
            <Link href="/search">
              <SearchIcon />
            </Link>
          </Button>

          {user ? (
            <UserMenu user={user} unread={unread} />
          ) : (
            <div className="flex items-center gap-1.5">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Register</Link>
              </Button>
            </div>
          )}

          <ThemeToggle initial={theme} />
        </div>
      </div>
    </header>
  );
}
