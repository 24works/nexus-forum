"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Instant theme switch driven by the `.dark` class on <html> (cookie-backed).
 * Both icons render and CSS picks the right one, so there is no client state
 * to hydrate.
 */
export function ThemeToggle({ initial }: { initial: "light" | "dark" }) {
  const toggle = () => {
    const dark = document.documentElement.classList.toggle("dark");
    document.cookie = `theme=${dark ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Toggle theme" title="Toggle theme">
      <SunIcon className="dark:hidden" />
      <MoonIcon className="hidden dark:block" />
    </Button>
  );
}
