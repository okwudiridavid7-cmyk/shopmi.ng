"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MarketplacePaginationProps = {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let i = current - 1; i <= current + 1; i++) {
    if (i >= 1 && i <= total) pages.add(i);
  }
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev && n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}

/** Numbered + prev/next pagination for marketplace grids. */
export function MarketplacePagination({
  page,
  pages,
  onPageChange,
  className = "",
}: MarketplacePaginationProps) {
  if (pages <= 1) return null;

  const items = pageWindow(page, pages);

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-wrap items-center justify-center gap-token-2 pt-token-4 ${className}`}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        <span className="sr-only sm:not-sr-only sm:ml-1">Prev</span>
      </Button>

      <ul className="flex flex-wrap items-center gap-1">
        {items.map((item, i) =>
          item === "…" ? (
            <li
              key={`ellipsis-${i}`}
              className="px-token-2 text-sm text-muted-foreground"
              aria-hidden
            >
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                aria-label={`Page ${item}`}
                aria-current={item === page ? "page" : undefined}
                onClick={() => onPageChange(item)}
                className={`min-w-[2rem] rounded-md px-token-2 py-token-1 text-sm transition ${
                  item === page
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {item}
              </button>
            </li>
          )
        )}
      </ul>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= pages}
        onClick={() => onPageChange(Math.min(pages, page + 1))}
        aria-label="Next page"
      >
        <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Button>
    </nav>
  );
}
