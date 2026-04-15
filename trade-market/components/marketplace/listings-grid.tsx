"use client";

import type { Listing } from "@/lib/mock-data";
import { ListingCard } from "@/components/marketplace/listing-card";
import { Card } from "@/components/ui/card";

export function ListingsGrid({
  items,
  isLoading,
}: {
  items: Listing[];
  isLoading: boolean;
}) {
  if (items.length === 0 && !isLoading) {
    return (
      <Card className="grid min-h-56 place-items-center border-dashed bg-surface/60 p-8 text-center text-sm text-muted-foreground">
        No listings found. Try widening filters or changing search.
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item, index) => (
        <ListingCard key={item.id} listing={item} delay={index * 0.06} />
      ))}
      {isLoading &&
        Array.from({ length: 4 }, (_, idx) => (
          <Card key={`skeleton-${idx}`} className="h-[320px] animate-pulse bg-surface/80" />
        ))}
    </div>
  );
}
