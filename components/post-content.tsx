import { cn } from "@/lib/utils";

/**
 * Renders the already-sanitized HTML produced by lib/markdown.ts.
 * The HTML is generated server-side from a fully-escaping renderer plus a
 * defense-in-depth sanitizer, so rendering it here is safe.
 */
export function PostContent({ html, className }: { html: string; className?: string }) {
  return <div className={cn("md-content", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
