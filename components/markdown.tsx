import { PostContent } from "@/components/post-content";

export function Markdown({ html, className }: { html: string; className?: string }) {
  return <PostContent html={html} className={className} />;
}