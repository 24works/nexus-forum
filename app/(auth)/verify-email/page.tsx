import type { Metadata } from "next";
import { VerifyEmailFlow } from "@/components/auth/verify-email-form";

export const metadata: Metadata = { title: "Verify email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div>
      <div className="mb-2">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Verify your email</h1>
      </div>
      <VerifyEmailFlow token={token ?? ""} />
    </div>
  );
}