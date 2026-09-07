"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { api } from "@/lib/api-client";

export function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldError(null);
    setNotice(null);
    try {
      const res = await api<{ debugVerificationLink?: string; verificationSent?: boolean }>("/api/auth/register", {
        method: "POST",
        json: { username, password, confirmPassword, email, company },
      });
      if (!res.ok) {
        if (res.field) setFieldError(res.field);
        setError(res.error ?? "Registration failed.");
        setBusy(false);
        return;
      }
      if (res.debugVerificationLink && !res.verificationSent) {
        setNotice(
          `Account created! Since email sending is not configured, verify your email here: ${res.debugVerificationLink}`
        );
        setBusy(false);
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 3000);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("A network error occurred.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <input
        type="text"
        name="company"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        style={{ display: "none" }}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      <Input
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
        required
        minLength={3}
        maxLength={20}
        autoFocus
        error={fieldError === "username" ? error ?? undefined : undefined}
        placeholder="3-20 characters (letters, numbers, _)"
      />
      <Input
        label="Email (optional)"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        error={fieldError === "email" ? error ?? undefined : undefined}
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        error={fieldError === "password" ? error ?? undefined : undefined}
        placeholder="At least 8 characters, letters + numbers"
      />
      <Input
        label="Confirm password"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        autoComplete="new-password"
        required
        minLength={8}
        error={fieldError === "confirmPassword" ? error ?? undefined : undefined}
      />

      {fieldError === "confirmPassword" || fieldError === "password" || fieldError === "username" || fieldError === "email" ? null : error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">{error}</p>
      ) : null}

      {notice && (
        <p className="break-all rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          {notice}
        </p>
      )}

      <Button type="submit" disabled={busy} className="w-full">
        <UserPlus className="size-4" />
        {busy ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Log in
        </Link>
      </p>
    </form>
  );
}