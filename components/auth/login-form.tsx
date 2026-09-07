"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { api } from "@/lib/api-client";

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirect = sp.get("next");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api("/api/auth/login", {
        method: "POST",
        json: { username, password },
      });
      if (!res.ok) {
        setError(res.error ?? "Login failed.");
        setBusy(false);
        return;
      }
      router.push(isSafeLocalPath(redirect) ? redirect! : "/");
      router.refresh();
    } catch {
      setError("A network error occurred.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
        required
        autoFocus
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
      />
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">{error}</p>
      )}
      <Button type="submit" disabled={busy} className="w-full">
        <LogIn className="size-4" />
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function isSafeLocalPath(path: string | null): path is string {
  if (!path) return false;
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\");
}