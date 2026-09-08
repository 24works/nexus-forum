import type { Metadata } from "next";
import { VerifyEmailFlow } from "@/components/auth/verify-email-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Verify email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Verify your email</CardTitle>
        <CardDescription>Confirm your email address to unlock all member features.</CardDescription>
      </CardHeader>
      <CardContent>
        <VerifyEmailFlow token={token ?? ""} />
      </CardContent>
    </Card>
  );
}
