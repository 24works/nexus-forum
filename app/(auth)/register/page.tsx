import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import { allowRegistration } from "@/lib/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  if (!allowRegistration()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Registration is closed</CardTitle>
          <CardDescription>
            New account registration is currently disabled by the administrators.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>Join the community — it only takes a minute.</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}
