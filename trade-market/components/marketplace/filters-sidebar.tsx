"use client";

import { RotateCcw } from "lucide-react";
import { CATEGORIES } from "@/lib/mock-data";
import { useMarketStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function FiltersSidebar() {
  const filters = useMarketStore((state) => state.filters);
  const setFilters = useMarketStore((state) => state.setFilters);
  const resetFilters = useMarketStore((state) => state.resetFilters);

  return (
    <Card className="sticky top-16 h-fit p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Filters</h2>
        <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5 px-2">
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      </div>

      <section className="space-y-3">
        <h3 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Category</h3>
        <div className="space-y-2">
          {CATEGORIES.map((category) => {
            const checked = filters.category.includes(category);
            return (
              <label key={category} className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked
                      ? filters.category.filter((item) => item !== category)
                      : [...filters.category, category];
                    setFilters({ category: next.length > 0 ? next : [...CATEGORIES] });
                  }}
                  className="h-4 w-4 rounded border-border bg-surface"
                  aria-label={`Filter category ${category}`}
                />
                {category}
              </label>
            );
          })}
        </div>
      </section>

      <Separator className="my-4" />

      <section className="space-y-3">
        <h3 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Price Range</h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span>${filters.priceRange[0].toFixed(0)}</span>
          <span className="text-right">${filters.priceRange[1].toFixed(0)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={5000}
          step={10}
          value={filters.priceRange[0]}
          onChange={(event) => {
            const min = Number(event.target.value);
            setFilters({ priceRange: [Math.min(min, filters.priceRange[1] - 10), filters.priceRange[1]] });
          }}
          className="w-full"
          aria-label="Minimum price"
        />
        <input
          type="range"
          min={0}
          max={5000}
          step={10}
          value={filters.priceRange[1]}
          onChange={(event) => {
            const max = Number(event.target.value);
            setFilters({ priceRange: [filters.priceRange[0], Math.max(max, filters.priceRange[0] + 10)] });
          }}
          className="w-full"
          aria-label="Maximum price"
        />
      </section>

      <Separator className="my-4" />

      <section className="space-y-2">
        <h3 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Sort Mode</h3>
        <div className="space-y-1.5 text-sm">
          {[
            ["featured", "Featured"],
            ["price-asc", "Price Asc"],
            ["price-desc", "Price Desc"],
            ["change-desc", "24h Change"],
            ["volume-desc", "Volume"],
          ].map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-foreground">
              <input
                type="radio"
                name="sort-sidebar"
                checked={filters.sort === value}
                onChange={() => setFilters({ sort: value as typeof filters.sort })}
                aria-label={`Sort by ${label}`}
              />
              {label}
            </label>
          ))}
        </div>
      </section>
    </Card>
  );
}
