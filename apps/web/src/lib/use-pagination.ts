import { useCallback, useEffect, useMemo, useState } from "react";

export function usePagination<T>(items: T[], pageSize: number = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(items.length / pageSize)),
    [items.length, pageSize],
  );

  // Reset to page 1 whenever the items array changes (e.g. filter/search)
  useEffect(() => {
    setCurrentPage(1);
  }, [items]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  const setPage = useCallback(
    (page: number) => {
      const clamped = Math.min(Math.max(1, page), totalPages);
      setCurrentPage(clamped);
    },
    [totalPages],
  );

  const goToFirst = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return { currentPage, totalPages, paginatedItems, setPage, goToFirst };
}
