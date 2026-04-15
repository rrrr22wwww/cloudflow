"use client";

import { useMemo, useState } from "react";
import type { Holding } from "@/lib/mock-data";
import { cn, formatPercent, formatPrice } from "@/lib/utils";

type SortKey = "asset" | "quantity" | "value" | "pnl";

export function HoldingsTable({ items }: { items: Holding[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [descending, setDescending] = useState(true);

  const sorted = useMemo(() => {
    const mapped = items.map((item) => {
      const value = item.quantity * item.currentPrice;
      const cost = item.quantity * item.avgCost;
      const pnlPct = ((value - cost) / cost) * 100;
      return { ...item, value, pnlPct };
    });

    return mapped.sort((a, b) => {
      const mult = descending ? -1 : 1;
      switch (sortKey) {
        case "asset":
          return a.asset.localeCompare(b.asset) * mult;
        case "quantity":
          return (a.quantity - b.quantity) * mult;
        case "pnl":
          return (a.pnlPct - b.pnlPct) * mult;
        default:
          return (a.value - b.value) * mult;
      }
    });
  }, [descending, items, sortKey]);

  const setSort = (key: SortKey) => {
    if (key === sortKey) {
      setDescending((value) => !value);
      return;
    }
    setSortKey(key);
    setDescending(true);
  };

  return (
    <section className="rounded-lg border border-border bg-surface-raised p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Holdings</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-widest text-muted-foreground">
              {[
                ["asset", "Asset"],
                ["quantity", "Qty"],
                ["value", "Value"],
                ["pnl", "P&L"],
              ].map(([key, label]) => (
                <th key={key} className="py-2">
                  <button
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => setSort(key as SortKey)}
                    aria-label={`Sort by ${label}`}
                  >
                    {label}
                    {sortKey === key ? (descending ? " ↓" : " ↑") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr key={item.id} className="border-b border-border/40 last:border-0">
                <td className="py-3 font-medium text-foreground">{item.asset}</td>
                <td className="py-3 font-mono text-muted-foreground">{item.quantity.toFixed(2)}</td>
                <td className="py-3 font-mono text-foreground">{formatPrice(item.value)}</td>
                <td
                  className={cn(
                    "py-3 font-mono",
                    item.pnlPct >= 0 ? "text-gain" : "text-loss",
                  )}
                >
                  {formatPercent(item.pnlPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
