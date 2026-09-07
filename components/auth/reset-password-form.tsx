"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { api } from "@/lib/api-client";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api("/api/auth/reset-password", {
        method: "POST",
        json: { token, password, confirmPassword },
      });
      if (!res.ok) {
        setError(res.error ?? "Could not reset password.");
        setBusy(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("A network error occurred.");
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <p className="rounded-lg bg-rose-50 px-3 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
        Missing reset token. Please use the link from your password reset email.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input
        label="New password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        autoFocus
        placeholder="At least 8 characters, letters + numbers"
      />
      <Input
        label="Confirm new password"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        autoComplete="new-password"
        required
        minLength={8}
      />
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">{error}</p>
      )}
      <Button type="submit" disabled={busy} className="w-full">
        <ShieldCheck className="size-4" />
        {busy ? "Resetting…" : "Reset password"}
      </Button>
    </form>
  );
}