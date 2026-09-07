import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Choose a new password</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Enter and confirm your new password to finish resetting your account.
        </p>
      </div>
      <ResetPasswordForm token={token ?? ""} />
      <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
        <Link href="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Back to log in
        </Link>
      </p>
    </div>
  );
}