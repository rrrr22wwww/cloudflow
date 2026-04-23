import Image from "next/image";
import { Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import type { MarketplaceItem } from "@/components/marketplace/types";
import { subtitleFromTags } from "@/components/marketplace/utils";

export function ServerCard({ item }: { item: MarketplaceItem }) {
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-surface-raised transition-all duration-200 ease-spring hover:-translate-y-0.5 hover:border-brand/30">
      <div className="relative aspect-[16/7] overflow-hidden bg-surface">
        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
        <div className="absolute left-2 top-2">
          <Badge>{item.category}</Badge>
        </div>
      </div>

      <div className="space-y-2 p-3">
        <h3 className="text-lg text-foreground">{item.name}</h3>
        <p className="text-xs text-muted-foreground">{subtitleFromTags(item)}</p>
        <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>

        <div className="mt-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-amber-400" />
              {item.rating.toFixed(1)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {item.players}/{item.capacity}
            </span>
          </div>
          <p className="font-mono text-foreground">{formatPrice(item.price)} / month</p>
        </div>
      </div>
    </article>
  );
}
