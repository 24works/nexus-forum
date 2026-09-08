"use client";

import { FormEvent, useState } from "react";
import { CheckIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-toggle";
import { PublicUser } from "@/lib/types";
import { api } from "@/lib/api-client";

type SettingsApiResponse = {
  ok: boolean;
  error?: string;
  field?: string;
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

  const fieldInvalid = (name: string) => (fieldError === name ? true : undefined);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldError(null);
    setSuccess(null);
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
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setBusy(false);
    } catch {
      setError("A network error occurred.");
      setBusy(false);
    }
  };

  // Keeps the cookie-backed theme in sync with the saved preference, so the
  // Select takes effect immediately (the cookie wins in resolveTheme()).
  const applyThemePreference = (pref: "system" | "light" | "dark") => {
    if (pref === "system") {
      document.cookie = "theme=; path=/; max-age=0; samesite=lax";
      document.documentElement.classList.toggle(
        "dark",
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    } else {
      document.cookie = `theme=${pref}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.classList.toggle("dark", pref === "dark");
    }
  };

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field data-invalid={fieldInvalid("bio")}>
          <FieldLabel htmlFor="settings-bio">Bio</FieldLabel>
          <Textarea
            id="settings-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="A short introduction shown on your profile."
            aria-invalid={fieldInvalid("bio")}
          />
          {fieldError === "bio" && error && <FieldDescription>{error}</FieldDescription>}
        </Field>

        <Field data-invalid={fieldInvalid("signature")}>
          <FieldLabel htmlFor="settings-signature">Signature</FieldLabel>
          <Textarea
            id="settings-signature"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="A signature displayed under your posts."
            aria-invalid={fieldInvalid("signature")}
          />
          {fieldError === "signature" && error && <FieldDescription>{error}</FieldDescription>}
        </Field>

        <Field data-invalid={fieldInvalid("theme")}>
          <FieldLabel htmlFor="settings-theme">Theme</FieldLabel>
          <Select
            value={theme}
            onValueChange={(v) => {
              const next = v as "system" | "light" | "dark";
              setTheme(next);
              applyThemePreference(next);
            }}
          >
            <SelectTrigger id="settings-theme" aria-invalid={fieldInvalid("theme")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          {fieldError === "theme" && error && <FieldDescription>{error}</FieldDescription>}
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Quick toggle</FieldTitle>
            <FieldDescription>Switch the site theme right now.</FieldDescription>
          </FieldContent>
          <ThemeToggle initial={themeClass} />
        </Field>

        <Field data-invalid={fieldInvalid("email")}>
          <FieldLabel htmlFor="settings-email">Email address</FieldLabel>
          <Input
            id="settings-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={fieldInvalid("email")}
          />
          {fieldError === "email" && error && <FieldDescription>{error}</FieldDescription>}
        </Field>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>Change password</FieldLegend>
          <FieldDescription>Leave blank to keep your current password.</FieldDescription>
          <FieldGroup className="gap-4">
            <Field data-invalid={fieldInvalid("currentPassword")}>
              <FieldLabel htmlFor="settings-current-password">Current password</FieldLabel>
              <Input
                id="settings-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                aria-invalid={fieldInvalid("currentPassword")}
              />
              {fieldError === "currentPassword" && error && <FieldDescription>{error}</FieldDescription>}
            </Field>
            <Field data-invalid={fieldInvalid("newPassword")}>
              <FieldLabel htmlFor="settings-new-password">New password</FieldLabel>
              <Input
                id="settings-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                aria-invalid={fieldInvalid("newPassword")}
              />
              {fieldError === "newPassword" && error && <FieldDescription>{error}</FieldDescription>}
            </Field>
            <Field data-invalid={fieldInvalid("confirmPassword")}>
              <FieldLabel htmlFor="settings-confirm-password">Confirm new password</FieldLabel>
              <Input
                id="settings-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                aria-invalid={fieldInvalid("confirmPassword")}
              />
              {fieldError === "confirmPassword" && error && <FieldDescription>{error}</FieldDescription>}
            </Field>
          </FieldGroup>
        </FieldSet>

        {error && !fieldError && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckIcon />
            <AlertTitle>{success}</AlertTitle>
          </Alert>
        )}

        <div>
          <Button type="submit" disabled={busy}>
            {busy && <Spinner data-icon="inline-start" />}
            {busy ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
