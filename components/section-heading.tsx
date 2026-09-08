import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SectionHeading({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {href && (
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href={href}>{linkLabel ?? "View all"}</Link>
        </Button>
      )}
    </div>
  );
}
