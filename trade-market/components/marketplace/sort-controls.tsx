"use client";

import { ArrowDownWideNarrow } from "lucide-react";

const OPTIONS = [
  { label: "Featured", value: "featured" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "24h Change", value: "change-desc" },
  { label: "24h Volume", value: "volume-desc" },
] as const;

export function SortControls({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-border bg-surface-overlay/60 px-3 py-2 text-xs text-muted-foreground">
      <ArrowDownWideNarrow className="h-3.5 w-3.5" />
      <span className="font-mono uppercase tracking-wider">Sort</span>
      <select
        className="min-w-44 bg-transparent text-sm text-foreground outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Sort listings"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value} className="bg-surface-overlay">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
