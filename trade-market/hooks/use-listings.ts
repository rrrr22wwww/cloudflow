"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Listing } from "@/lib/mock-data";

interface UseListingsOptions {
  categories: string[];
  minPrice: number;
  maxPrice: number;
  sort: string;
  search: string;
  limit?: number;
}

interface ListingsResponse {
  items: Listing[];
  total: number;
  page: number;
  hasMore: boolean;
}

export function useListings(options: UseListingsOptions) {
  const [items, setItems] = useState<Listing[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const limit = options.limit ?? 8;

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (options.categories.length > 0) {
      params.set("category", options.categories.join(","));
    }
    params.set("minPrice", options.minPrice.toString());
    params.set("maxPrice", options.maxPrice.toString());
    params.set("sort", options.sort);
    params.set("search", options.search);
    params.set("limit", limit.toString());
    return params;
  }, [limit, options.categories, options.maxPrice, options.minPrice, options.search, options.sort]);

  const fetchPage = useCallback(
    async (targetPage: number, replace: boolean) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams(query);
        params.set("page", targetPage.toString());
        const response = await fetch(`/api/listings?${params.toString()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load listings");
        }

        const data = (await response.json()) as ListingsResponse;
        setItems((prev) => (replace ? data.items : [...prev, ...data.items]));
        setTotal(data.total);
        setHasMore(data.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    },
    [query],
  );

  useEffect(() => {
    setPage(1);
    void fetchPage(1, true);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) {
      return;
    }
    const nextPage = page + 1;
    setPage(nextPage);
    void fetchPage(nextPage, false);
  }, [fetchPage, hasMore, isLoading, page]);

  return {
    items,
    total,
    hasMore,
    isLoading,
    error,
    loadMore,
  };
}
