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
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ sent?: boolean }>("/api/auth/forgot-password", {
        method: "POST",
        json: { email },
      });
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      setDone(true);
      setSent(Boolean(res.sent));
      setBusy(false);
    } catch {
      setError("A network error occurred.");
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col gap-3">
        {sent ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            If an account exists for that email address, a password reset link has been sent. Check your inbox.
          </p>
        ) : (
          <p className="rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            Email sending is not configured on this forum, so a reset link cannot be delivered automatically.
            Please contact the site administrator to reset your password.
          </p>
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