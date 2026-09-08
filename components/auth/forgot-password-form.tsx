"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { KeyRoundIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
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
          <Alert>
            <AlertTitle>Check your inbox</AlertTitle>
            <AlertDescription>
              If an account exists for that email address, a password reset link has been sent.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertTitle>Email sending is not configured</AlertTitle>
            <AlertDescription>
              A reset link cannot be delivered automatically. Please contact the site administrator to reset your
              password.
            </AlertDescription>
          </Alert>
        )}
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link href="/login">Back to log in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="forgot-email">Email address</FieldLabel>
          <Input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </Field>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? <Spinner data-icon="inline-start" /> : <KeyRoundIcon data-icon="inline-start" />}
          {busy ? "Sending…" : "Send reset link"}
        </Button>
      </FieldGroup>
    </form>
  );
}
