import { env } from "cloudflare:workers";

interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends transactional email via the Resend API when `RESEND_API_KEY` is
 * configured. Returns false when no provider is configured, in which case
 * the caller decides how to surface verification/reset links (a pragmatic
 * default that lets the full auth flow work with zero external setup).
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = (env as { RESEND_API_KEY?: string }).RESEND_API_KEY;
  const from = (env as { RESEND_FROM?: string }).RESEND_FROM || "Nexus Forum <onboarding@resend.dev>";
  if (!apiKey) return false;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [payload.to], subject: payload.subject, text: payload.text, html: payload.html }),
    });
    return true;
  } catch (err) {
    console.error("[email] failed to send:", err);
    return false;
  }
}

export function emailConfigured(): boolean {
  return Boolean((env as { RESEND_API_KEY?: string }).RESEND_API_KEY);
}

export function siteUrl(req: Request): string {
  return new URL(req.url).origin;
}