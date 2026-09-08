import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { allowRegistration } from "@/lib/settings";
import { currentUserRSC } from "@/lib/session-rsc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  // Signed-in visitors have no business on the registration form.
  if (await currentUserRSC()) redirect("/");

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
