"use client";

import Image from "next/image";
import Link from "next/link";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { motion } from "motion/react";
import type { Listing } from "@/lib/mock-data";
import { useMarketStore } from "@/lib/store";
import { cn, formatCompact, formatPercent, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function ListingCard({ listing, delay = 0 }: { listing: Listing; delay?: number }) {
  const watchlist = useMarketStore((state) => state.watchlist);
  const toggleWatchlist = useMarketStore((state) => state.toggleWatchlist);
  const isSaved = watchlist.includes(listing.id);

  const badgeVariant =
    listing.badge === "Hot" ? "danger" : listing.badge === "Verified" ? "success" : "default";

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="h-full"
    >
      <Card className="group flex h-full flex-col overflow-hidden transition-all duration-200 ease-spring hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card-hover">
        <div className="relative aspect-video overflow-hidden bg-surface">
          <Image
            src={listing.imageUrl}
            alt={listing.name}
            fill
            className="object-cover transition-transform duration-300 ease-spring group-hover:scale-[1.03]"
          />
          <button
            aria-label={isSaved ? "Remove from watchlist" : "Add to watchlist"}
            onClick={() => toggleWatchlist(listing.id)}
            className="absolute right-2 top-2 rounded-md border border-border/70 bg-surface-overlay/80 p-1 text-muted-foreground hover:text-foreground"
          >
            {isSaved ? <BookmarkCheck className="h-4 w-4 text-brand" /> : <Bookmark className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="mb-2 flex items-start justify-between gap-3">
            <h3 className="text-base font-medium text-foreground">{listing.name}</h3>
            <Badge variant={badgeVariant}>{listing.badge}</Badge>
          </div>

          <p className="line-clamp-2 text-sm text-muted-foreground">{listing.description}</p>

          <div className="mt-4">
            <Separator className="mb-3" />
            <div className="mb-3 flex items-center justify-between font-mono text-sm">
              <span className="text-foreground">{formatPrice(listing.price)}</span>
              <span className={cn(listing.priceChange24h >= 0 ? "text-gain" : "text-loss")}>
                {listing.priceChange24h >= 0 ? "▲" : "▼"} {formatPercent(listing.priceChange24h)}
              </span>
            </div>
            <div className="mt-auto flex items-center justify-between gap-3">
              <Link
                href={`/listing/${listing.id}`}
                className={buttonClasses({ variant: "primary", size: "sm", className: "flex-1" })}
                aria-label={`Buy ${listing.name}`}
              >
                Buy Now
              </Link>
              <span className="font-mono text-xs text-muted-foreground">Vol: {formatCompact(listing.volume24h)}</span>
            </div>
          </div>
        </div>
      </Card>
    </motion.article>
  );
}
