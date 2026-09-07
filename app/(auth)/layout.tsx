import { Card } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-start justify-center pt-10">
      <Card className="w-full max-w-md p-6">{children}</Card>
    </div>
  );
}