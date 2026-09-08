"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MailCheckIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api-client";

export function VerifyEmailFlow({ token }: { token: string }) {
  const [state, setState] = useState<"loading" | "success" | "error" | "info" | "idle">("loading");
  const [message, setMessage] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [resendOpen, setResendOpen] = useState(false);
  const [resendEmail, setResendEmail] = useState("");

  useEffect(() => {
    void runVerification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const runVerification = async (t = token) => {
    if (!t) {
      setState("error");
      setMessage("Missing verification token. Please open the link from your email.");
      return;
    }
    setState("loading");
    try {
      const res = await api("/api/auth/verify-email", {
        method: "POST",
        json: { token: t },
      });
      if (res.ok) {
        setState("success");
        setMessage("Your email address has been verified. Thank you!");
      } else {
        setState("error");
        setMessage(res.error ?? "Verification failed.");
      }
    } catch {
      setState("error");
      setMessage("A network error occurred. Please try again.");
    }
  };

  const resend = async () => {
    if (!resendEmail.trim()) return;
    setBusy(true);
    try {
      const res = await api<{ verified?: boolean }>("/api/auth/resend-verification", {
        method: "POST",
        json: { email: resendEmail },
      });
      setResendOpen(false);
      if (res.ok) {
        if (res.verified) {
          setMessage("Email sending is not configured here, so your address has been verified directly.");
        } else {
          setMessage("A new verification email has been sent.");
        }
        setState("info");
        setResendEmail("");
      } else {
        setMessage(res.error ?? "Failed to resend verification.");
        setState("error");
      }
    } catch {
      setMessage("A network error occurred. Please try again.");
      setState("error");
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      {state === "loading" ? (
        <div className="flex flex-col items-center gap-3">
          <Spinner className="size-8 text-primary" />
          <p className="text-sm text-muted-foreground">Verifying…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-foreground">
            <MailCheckIcon className="size-6" />
          </div>
          <Alert
            variant={state === "error" ? "destructive" : "default"}
            className="w-full max-w-sm"
          >
            <AlertDescription>{message}</AlertDescription>
          </Alert>
          {state !== "success" && (
            <Button variant="outline" size="sm" onClick={() => setResendOpen(true)} disabled={busy}>
              {busy ? <Spinner data-icon="inline-start" /> : null}
              {busy ? "Sending…" : "Resend verification email"}
            </Button>
          )}
          <Button asChild variant="link" size="sm">
            <Link href="/">Continue to the forum</Link>
          </Button>
        </div>
      )}

      <Dialog open={resendOpen} onOpenChange={setResendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resend verification email</DialogTitle>
            <DialogDescription>
              Enter the email address associated with your account and we will send a new verification link.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="resend-email">Email address</FieldLabel>
            <Input
              id="resend-email"
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
            />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResendOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={resend} disabled={busy || !resendEmail.trim()}>
              {busy ? <Spinner data-icon="inline-start" /> : null}
              {busy ? "Sending…" : "Send link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
