import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Log in to join the conversation.</p>
      </div>
      <LoginForm />
      <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
        New here?{" "}
        <Link href="/register" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
        <Link href="/forgot-password" className="hover:underline">
          Forgot your password?
        </Link>
      </p>
    </div>
  );
}