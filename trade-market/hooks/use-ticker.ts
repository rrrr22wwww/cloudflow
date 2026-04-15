"use client";

import { useEffect, useState } from "react";

export interface TickerRow {
  symbol: string;
  price: number;
  change24h: number;
}

export function useTicker(pollMs = 6000) {
  const [items, setItems] = useState<TickerRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/stats", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as TickerRow[];
        if (!cancelled) {
          setItems(data);
        }
      } catch {
        // no-op polling fallback
      }
    };

    void load();
    const timer = setInterval(() => {
      void load();
    }, pollMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pollMs]);

  return items;
}
