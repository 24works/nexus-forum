"use client";

import { FormEvent, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { PublicUser } from "@/lib/types";
import { api } from "@/lib/api-client";

type SettingsApiResponse = {
  ok: boolean;
  error?: string;
  field?: string;
  debugVerificationLink?: string | null;
};

export function SettingsForm({
  user,
  themeClass,
}: {
  user: PublicUser;
  themeClass: "light" | "dark";
}) {
  const [bio, setBio] = useState(user.bio ?? "");
  const [signature, setSignature] = useState(user.signature ?? "");
  const [theme, setTheme] = useState<"system" | "light" | "dark">(user.theme ?? "system");
  const [email, setEmail] = useState(user.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [verificationLink, setVerificationLink] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldError(null);
    setSuccess(null);
    setVerificationLink(null);
    try {
      const res = await api<SettingsApiResponse>("/api/me", {
        method: "PATCH",
        json: {
          bio,
          signature,
          theme,
          email,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
          confirmPassword: confirmPassword || undefined,
        },
      });
      if (!res.ok) {
        if (res.field) setFieldError(res.field);
        setError(res.error ?? "Could not update your settings.");
        setBusy(false);
        return;
      }
      setSuccess("Your settings have been updated.");
      setVerificationLink(res.debugVerificationLink ?? null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setBusy(false);
    } catch {
      setError("A network error occurred.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Textarea
        label="Bio"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="A short introduction shown on your profile."
        error={fieldError === "bio" ? error ?? undefined : undefined}
      />

      <Textarea
        label="Signature"
        value={signature}
        onChange={(e) => setSignature(e.target.value)}
        rows={2}
        maxLength={300}
        placeholder="A signature displayed under your posts."
        error={fieldError === "signature" ? error ?? undefined : undefined}
      />

      <Select
        label="Theme"
        value={theme}
        onChange={(e) => setTheme(e.target.value as "system" | "light" | "dark")}
        error={fieldError === "theme" ? error ?? undefined : undefined}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </Select>

      <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-700">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Quick toggle</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Switch the site theme right now.</p>
        </div>
        <ThemeToggle initial={themeClass} />
      </div>

      <Input
        label="Email address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
        error={fieldError === "email" ? error ?? undefined : undefined}
      />

      <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
        <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Change password</h3>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Leave blank to keep your current password.
        </p>
        <div className="flex flex-col gap-3">
          <Input
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            error={fieldError === "currentPassword" ? error ?? undefined : undefined}
          />
          <Input
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            error={fieldError === "newPassword" ? error ?? undefined : undefined}
          />
          <Input
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            error={fieldError === "confirmPassword" ? error ?? undefined : undefined}
          />
        </div>
      </div>

      {error && !fieldError && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
          {error}
        </p>
      )}

      {success && (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          <Check className="size-4" />
          {success}
        </p>
      )}

      {verificationLink && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
          <p className="font-medium">Email verification link (email sending not configured):</p>
          <a href={verificationLink} className="mt-1 block break-all font-mono text-xs underline">
            {verificationLink}
          </a>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          {busy ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
