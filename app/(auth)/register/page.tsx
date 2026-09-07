import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import { allowRegistration } from "@/lib/settings";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  if (!allowRegistration()) {
    return (
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Registration is closed</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          New account registration is currently disabled by the administrators.
        </p>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Join the community — it only takes a minute.
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}