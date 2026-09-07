import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Reset your password</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Enter your account email and we will send you a reset link.
        </p>
      </div>
      <ForgotPasswordForm />
      <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
        <Link href="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Back to log in
        </Link>
      </p>
    </div>
  );
}