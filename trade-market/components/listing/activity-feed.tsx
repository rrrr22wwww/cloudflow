import { formatPrice } from "@/lib/utils";
import type { PricePoint } from "@/lib/mock-data";

export function ActivityFeed({ history }: { history: PricePoint[] }) {
  const recent = [...history].slice(-10).reverse();

  return (
    <section className="rounded-lg border border-border bg-surface-raised p-4">
      <h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">Recent Activity</h3>
      <div className="space-y-2 text-sm">
        {recent.map((item) => (
          <article
            key={item.t}
            className="flex items-center justify-between rounded border border-border/40 bg-surface px-3 py-2"
          >
            <div>
              <p className="font-mono text-xs text-muted-foreground">
                {new Date(item.t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-xs text-muted-foreground">Volume {item.volume.toFixed(2)}</p>
            </div>
            <p className="font-mono text-sm text-foreground">{formatPrice(item.price)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
