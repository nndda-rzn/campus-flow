"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export interface PaginationProps {
  currentPage: number; // 1-indexed
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalItems === 0 || totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Build the page number list (max 5 visible, with ellipsis)
  const pages = buildPageList(currentPage, totalPages);

  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[12px] text-text-muted">
        Menampilkan {startItem}–{endItem} dari {totalItems} pengajuan
      </p>

      <div className="flex items-center gap-1">
        {/* Previous */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="size-3.5" />
          Sebelumnya
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-0.5">
          {pages.map((page, idx) =>
            page === "ellipsis" ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-1.5 text-[12.5px] text-text-muted select-none"
              >
                …
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                className={cn(
                  "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[12.5px] font-medium transition-colors",
                  page === currentPage
                    ? "bg-primary text-text-inverse"
                    : "text-text-secondary hover:bg-background-alt",
                )}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </button>
            ),
          )}
        </div>

        {/* Next */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Halaman berikutnya"
        >
          Berikutnya
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type PageItem = number | "ellipsis";

/**
 * Returns a list of page numbers (and "ellipsis" placeholders) to render.
 * Shows at most 5 page numbers. If total ≤ 7, shows all pages.
 *
 * Examples:
 *   totalPages=10, current=1  → [1, 2, 3, 4, 5, "ellipsis", 10]
 *   totalPages=10, current=5  → [1, "ellipsis", 4, 5, 6, "ellipsis", 10]
 *   totalPages=10, current=10 → [1, "ellipsis", 6, 7, 8, 9, 10]
 *   totalPages=5,  current=3  → [1, 2, 3, 4, 5]
 */
function buildPageList(current: number, total: number): PageItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const delta = 2; // pages on each side of current
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  const pages: PageItem[] = [1];

  if (left > 2) pages.push("ellipsis");

  for (let p = left; p <= right; p++) {
    pages.push(p);
  }

  if (right < total - 1) pages.push("ellipsis");

  pages.push(total);

  return pages;
}
