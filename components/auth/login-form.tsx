"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LogInIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api-client";

export function LoginForm() {
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
      // The session cookie must be visible to a fresh server render —
      // the cached client layout would keep showing the signed-out header.
      window.location.assign(isSafeLocalPath(redirect) ? redirect! : "/");
    } catch {
      setError("A network error occurred.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="login-username">Username</FieldLabel>
          <Input
            id="login-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            autoFocus
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="login-password">Password</FieldLabel>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? <Spinner data-icon="inline-start" /> : <LogInIcon data-icon="inline-start" />}
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </FieldGroup>
    </form>
  );
}

function isSafeLocalPath(path: string | null): path is string {
  if (!path) return false;
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\");
}
