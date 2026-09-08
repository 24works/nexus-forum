import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsIcon } from "lucide-react";
import { currentUserRSC, resolveThemeClass } from "@/lib/session-rsc";
import { SettingsForm } from "@/components/settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Account settings" };

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await currentUserRSC();
  if (!user) redirect("/login?next=/me/settings");

  const themeClass = await resolveThemeClass();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
          <SettingsIcon className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Account settings</h1>
          <p className="text-sm text-muted-foreground">Manage your profile, theme, and password.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile &amp; account</CardTitle>
          <CardDescription>Changes apply immediately after saving.</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm user={user} themeClass={themeClass} />
        </CardContent>
      </Card>
    </div>
  );
}
