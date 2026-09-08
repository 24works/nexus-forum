import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Log in to join the conversation.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <LoginForm />
        <div className="flex flex-col items-center gap-1 text-center text-sm">
          <p className="text-muted-foreground">
            New here?{" "}
            <Link href="/register" className="font-medium underline underline-offset-4 hover:no-underline">
              Create an account
            </Link>
          </p>
          <Link href="/forgot-password" className="text-xs text-muted-foreground hover:underline">
            Forgot your password?
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
