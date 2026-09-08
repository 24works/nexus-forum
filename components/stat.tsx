import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card className="py-4">
      <CardContent className="flex flex-col items-center gap-0.5 px-4">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}
