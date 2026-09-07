"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MailCheck, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { api } from "@/lib/api-client";

export function VerifyEmailFlow({ token }: { token: string }) {
  const [state, setState] = useState<"loading" | "success" | "error" | "info" | "idle">("loading");
  const [message, setMessage] = useState<string>("");
  const [busy, setBusy] = useState(false);

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
    setBusy(true);
    const email = window.prompt("Enter your email address to resend the verification link:");
    if (!email) {
      setBusy(false);
      return;
    }
    try {
      const res = await api<{ verified?: boolean }>("/api/auth/resend-verification", {
        method: "POST",
        json: { email },
      });
      if (res.ok) {
        if (res.verified) {
          setMessage("Email sending is not configured here, so your address has been verified directly.");
        } else {
          setMessage("A new verification email has been sent.");
        }
        setState("info");
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
          <Loader2 className="size-8 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Verifying…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div
            className={
              "flex size-12 items-center justify-center rounded-full " +
              (state === "success"
                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                : state === "info"
                  ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
                  : "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400")
            }
          >
            <MailCheck className="size-6" />
          </div>
          <p
            className={
              "text-sm " +
              (state === "success"
                ? "text-emerald-700 dark:text-emerald-400"
                : state === "info"
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-rose-600 dark:text-rose-400")
            }
          >
            {message}
          </p>
          {state !== "success" && (
            <Button variant="outline" size="sm" onClick={resend} disabled={busy}>
              <RefreshCw className="size-4" /> {busy ? "Sending…" : "Resend verification email"}
            </Button>
          )}
          <Link href="/" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Continue to the forum
          </Link>
        </div>
      )}
    </div>
  );
}