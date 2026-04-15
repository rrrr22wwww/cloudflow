"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

interface Point {
  day: number;
  value: number;
}

const ranges = [30, 90, 180] as const;

export function PnlChart({ data }: { data: Point[] }) {
  const [range, setRange] = useState<(typeof ranges)[number]>(90);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sliced = useMemo(() => data.slice(-range), [data, range]);

  return (
    <section className="rounded-lg border border-border bg-surface-raised p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Portfolio P&L</h3>
        <div className="flex gap-2">
          {ranges.map((value) => (
            <Button
              key={value}
              size="sm"
              variant={range === value ? "primary" : "secondary"}
              onClick={() => setRange(value)}
            >
              {value}D
            </Button>
          ))}
        </div>
      </div>

      {mounted ? (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sliced} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--brand))" stopOpacity={0.24} />
                  <stop offset="100%" stopColor="hsl(var(--brand))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border) / 0.3)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                width={52}
              />
              <Tooltip
                formatter={(value) => formatPrice(Number(value ?? 0))}
                contentStyle={{
                  background: "hsl(var(--surface-overlay))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--brand))"
                strokeWidth={2}
                fill="url(#pnlGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[280px] w-full animate-pulse rounded-md bg-surface" />
      )}
    </section>
  );
}
