import Link from "next/link";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

/**
 * Link-based pagination built on the shadcn pagination primitives.
 * `buildHref` returns the URL for a page; <Link> keeps navigation client-side.
 */
export function ForumPagination({
  page,
  totalPages,
  buildHref,
  className,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  const pages = pageWindow(page, totalPages);

  return (
    <Pagination className={cn("justify-center", className)}>
      <PaginationContent>
        <PaginationItem>
          {page <= 1 ? (
            <PaginationPrevious href={buildHref(1)} aria-disabled className="pointer-events-none opacity-50" />
          ) : (
            <PaginationPrevious href={buildHref(page - 1)} />
          )}
        </PaginationItem>
        {pages.map((p, idx) =>
          p === null ? (
            <PaginationItem key={`gap-${idx}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink href={buildHref(p)} isActive={p === page}>
                {p}
              </PaginationLink>
            </PaginationItem>
          )
        )}
        <PaginationItem>
          {page >= totalPages ? (
            <PaginationNext href={buildHref(totalPages)} aria-disabled className="pointer-events-none opacity-50" />
          ) : (
            <PaginationNext href={buildHref(page + 1)} />
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function pageWindow(page: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | null)[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) pages.push(null);
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push(null);
  pages.push(total);
  return pages;
}
