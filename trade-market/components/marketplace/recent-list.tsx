import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import type { MarketplaceItem } from "@/components/marketplace/types";
import { formatAgo, subtitleFromTags } from "@/components/marketplace/utils";

export function RecentPublishedList({ items }: { items: MarketplaceItem[] }) {
  return (
    <Card className="p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Recently Published
        </p>
        <button
          type="button"
          className="text-xs font-mono uppercase tracking-wider text-brand hover:underline"
        >
          View All
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={`recent-${item.id}`}
            className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate text-foreground">{item.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {item.category} • {subtitleFromTags(item)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">{formatAgo(item.createdAt)}</p>
            <p className="text-xs text-muted-foreground">
              {item.players}/{item.capacity}
            </p>
            <p className="font-mono text-foreground">{formatPrice(item.price)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
