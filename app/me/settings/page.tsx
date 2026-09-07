import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { currentUserRSC, resolveThemeClass } from "@/lib/session-rsc";
import { SettingsForm } from "@/components/settings-form";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Account settings" };

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await currentUserRSC();
  if (!user) redirect("/login?next=/me/settings");

  const themeClass = await resolveThemeClass();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Settings className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Account settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage your profile, theme, and password.
          </p>
        </div>
      </div>

      <Card>
        <SettingsForm user={user} themeClass={themeClass} />
      </Card>
    </div>
  );
}