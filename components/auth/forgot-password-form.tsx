"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { api } from "@/lib/api-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ debugResetLink?: string | null }>("/api/auth/forgot-password", {
        method: "POST",
        json: { email },
      });
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      setDone(true);
      setResetLink(res.debugResetLink ?? null);
      setBusy(false);
    } catch {
      setError("A network error occurred.");
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          If an account exists for that email address, a password reset link has been sent. Check your inbox.
        </p>
        {resetLink && (
          <div className="rounded-lg bg-slate-100 px-3 py-3 dark:bg-slate-800">
            <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Email sending is not configured — use this link directly:
            </p>
            <a href={resetLink} className="break-all text-sm text-indigo-600 hover:underline dark:text-indigo-400">
              {resetLink}
            </a>
          </div>
        )}
        <Link href="/login" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input
        label="Email address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoFocus
      />
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">{error}</p>
      )}
      <Button type="submit" disabled={busy} className="w-full">
        <KeyRound className="size-4" />
        {busy ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}