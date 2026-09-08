"use client";

import { FormEvent, useState } from "react";
import { ShieldCheckIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api-client";

export function ResetPasswordForm({ token }: { token: string }) {
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
      // Hard navigation so the server render reflects the current session.
      window.location.assign("/");
    } catch {
      setError("A network error occurred.");
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Missing reset token. Please use the link from your password reset email.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="reset-password">New password</FieldLabel>
          <Input
            id="reset-password"
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
        </Field>
        <Field>
          <FieldLabel htmlFor="reset-confirm">Confirm new password</FieldLabel>
          <Input
            id="reset-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </Field>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? <Spinner data-icon="inline-start" /> : <ShieldCheckIcon data-icon="inline-start" />}
          {busy ? "Resetting…" : "Reset password"}
        </Button>
      </FieldGroup>
    </form>
  );
}
