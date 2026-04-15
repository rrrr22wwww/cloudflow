"use client";

import { useEffect, useMemo, useState } from "react";
import { cn, formatPrice } from "@/lib/utils";

interface OrderRow {
  price: number;
  volume: number;
}

export function OrderBook({ basePrice }: { basePrice: number }) {
  const [seed, setSeed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeed((value) => value + 1), 2200);
    return () => clearInterval(timer);
  }, []);

  const { bids, asks, maxVolume } = useMemo(() => {
    const nextBids: OrderRow[] = Array.from({ length: 6 }, (_, idx) => {
      const price = basePrice - idx * 1.5 - seed * 0.05;
      const volume = 4 + ((seed * 7 + idx * 9) % 22);
      return { price, volume };
    });

    const nextAsks: OrderRow[] = Array.from({ length: 6 }, (_, idx) => {
      const price = basePrice + idx * 1.5 + seed * 0.05;
      const volume = 3 + ((seed * 11 + idx * 13) % 20);
      return { price, volume };
    });

    const volumeMax = Math.max(
      ...nextBids.map((row) => row.volume),
      ...nextAsks.map((row) => row.volume),
    );

    return { bids: nextBids, asks: nextAsks, maxVolume: volumeMax };
  }, [basePrice, seed]);

  return (
    <section className="rounded-lg border border-border bg-surface-raised p-4">
      <h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">Order Book</h3>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-border pb-2 text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
        <span>Bids</span>
        <span className="px-4">|</span>
        <span className="text-right">Asks</span>
      </div>

      <div className="mt-2 space-y-1 text-xs font-mono">
        {bids.map((bid, idx) => {
          const ask = asks[idx];
          const bidWidth = (bid.volume / maxVolume) * 100;
          const askWidth = (ask.volume / maxVolume) * 100;

          return (
            <div key={`row-${idx}`} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="relative overflow-hidden rounded border border-border/40 px-2 py-1">
                <span
                  className={cn(
                    "absolute left-0 top-0 h-full bg-gain/20",
                    seed % 2 === 0 && "animate-flash-up",
                  )}
                  style={{ width: `${bidWidth}%` }}
                />
                <div className="relative z-10 flex justify-between text-gain">
                  <span>{formatPrice(bid.price)}</span>
                  <span>{bid.volume.toFixed(1)}</span>
                </div>
              </div>

              <span className="text-muted-foreground">|</span>

              <div className="relative overflow-hidden rounded border border-border/40 px-2 py-1">
                <span
                  className={cn(
                    "absolute right-0 top-0 h-full bg-loss/20",
                    seed % 2 === 1 && "animate-flash-down",
                  )}
                  style={{ width: `${askWidth}%` }}
                />
                <div className="relative z-10 flex justify-between text-loss">
                  <span>{ask.volume.toFixed(1)}</span>
                  <span>{formatPrice(ask.price)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
