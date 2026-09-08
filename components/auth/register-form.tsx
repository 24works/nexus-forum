"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { UserPlusIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api-client";

export function RegisterForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fieldInvalid = (name: string) => (fieldError === name ? true : undefined);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldError(null);
    setNotice(null);
    try {
      const res = await api<{ verificationSent?: boolean }>("/api/auth/register", {
        method: "POST",
        json: { username, password, confirmPassword, email, company },
      });
      if (!res.ok) {
        if (res.field) setFieldError(res.field);
        setError(res.error ?? "Registration failed.");
        setBusy(false);
        return;
      }
      // The registration response also signs the user in; a hard navigation
      // makes the fresh session cookie visible to the server-rendered header.
      window.location.assign("/");
    } catch {
      setError("A network error occurred.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
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
      <FieldGroup>
        <Field data-invalid={fieldInvalid("username")}>
          <FieldLabel htmlFor="register-username">Username</FieldLabel>
          <Input
            id="register-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            minLength={3}
            maxLength={20}
            autoFocus
            placeholder="3-20 characters (letters, numbers, _)"
            aria-invalid={fieldInvalid("username")}
          />
          {fieldError === "username" && error && <FieldDescription>{error}</FieldDescription>}
        </Field>
        <Field data-invalid={fieldInvalid("email")}>
          <FieldLabel htmlFor="register-email">Email (optional)</FieldLabel>
          <Input
            id="register-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={fieldInvalid("email")}
          />
          {fieldError === "email" && error && <FieldDescription>{error}</FieldDescription>}
        </Field>
        <Field data-invalid={fieldInvalid("password")}>
          <FieldLabel htmlFor="register-password">Password</FieldLabel>
          <Input
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            placeholder="At least 8 characters, letters + numbers"
            aria-invalid={fieldInvalid("password")}
          />
          {fieldError === "password" && error && <FieldDescription>{error}</FieldDescription>}
        </Field>
        <Field data-invalid={fieldInvalid("confirmPassword")}>
          <FieldLabel htmlFor="register-confirm">Confirm password</FieldLabel>
          <Input
            id="register-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            aria-invalid={fieldInvalid("confirmPassword")}
          />
          {fieldError === "confirmPassword" && error && <FieldDescription>{error}</FieldDescription>}
        </Field>

        {error && !fieldError && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {notice && (
          <Alert>
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? <Spinner data-icon="inline-start" /> : <UserPlusIcon data-icon="inline-start" />}
          {busy ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium underline underline-offset-4 hover:no-underline">
            Log in
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
