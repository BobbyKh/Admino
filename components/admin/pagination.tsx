"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  siblingCount?: number;
}

function generatePagination(current: number, totalPages: number, siblingCount = 1) {
  const totalNumbers = siblingCount * 2 + 5; // siblings + current + first + last + 2 ellipses

  if (totalPages <= totalNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(current - siblingCount, 1);
  const rightSiblingIndex = Math.min(current + siblingCount, totalPages);

  const shouldShowLeftDots = leftSiblingIndex > 2;
  const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, "right-dots", totalPages];
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => totalPages - rightItemCount + i + 1
    );
    return [1, "left-dots", ...rightRange];
  }

  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i
  );
  return [1, "left-dots", ...middleRange, "right-dots", totalPages];
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  siblingCount = 1,
}: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const pages = generatePagination(page, totalPages, siblingCount);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between gap-4 px-2">
      <p className="text-sm text-muted-foreground">
        Showing {startItem}–{endItem} of {total}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={page === 1}
          onClick={() => goToPage(1)}
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={page === 1}
          onClick={() => goToPage(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>

        {pages.map((item, i) => {
          if (typeof item === "string") {
            return (
              <span key={item} className="px-1 text-muted-foreground">
                ...
              </span>
            );
          }
          return (
            <Button
              key={item}
              variant={item === page ? "default" : "outline"}
              size="icon"
              className="size-8"
              onClick={() => goToPage(item)}
            >
              {item}
            </Button>
          );
        })}

        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={page === totalPages}
          onClick={() => goToPage(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={page === totalPages}
          onClick={() => goToPage(totalPages)}
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
