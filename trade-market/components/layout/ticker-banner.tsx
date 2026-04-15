"use client";

import { useMemo } from "react";
import { useTicker } from "@/hooks/use-ticker";
import { cn, formatPercent, formatPrice } from "@/lib/utils";

export function TickerBanner() {
  const items = useTicker();
  const repeated = useMemo(() => [...items, ...items], [items]);

  if (repeated.length === 0) {
    return (
      <div className="h-8 border-b border-border bg-surface" aria-label="Ticker loading" />
    );
  }

  return (
    <aside className="h-8 overflow-hidden border-b border-border bg-surface" aria-label="Market ticker">
      <div className="flex min-w-max animate-ticker-left items-center gap-8 px-4 text-[11px] font-mono text-muted-foreground">
        {repeated.map((item, idx) => (
          <p key={`${item.symbol}-${idx}`} className="flex items-center gap-2 py-2">
            <span>{item.symbol}</span>
            <span className="text-foreground">{formatPrice(item.price)}</span>
            <span className={cn(item.change24h >= 0 ? "text-gain" : "text-loss")}>
              {item.change24h >= 0 ? "▲" : "▼"} {formatPercent(item.change24h)}
            </span>
          </p>
        ))}
      </div>
    </aside>
  );
}
