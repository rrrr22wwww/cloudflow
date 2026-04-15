"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PricePoint } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";

export function PriceChart({ data }: { data: PricePoint[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = data.map((point) => ({
    time: new Date(point.t).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    price: point.price,
    volume: point.volume,
  }));

  if (!mounted) {
    return <div className="h-[280px] w-full animate-pulse rounded-lg border border-border bg-surface-raised p-4" />;
  }

  return (
    <div className="h-[280px] w-full rounded-lg border border-border bg-surface-raised p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="brandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--brand))" stopOpacity={0.28} />
              <stop offset="100%" stopColor="hsl(var(--brand))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--border) / 0.3)" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} minTickGap={30} />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickFormatter={(value) => `$${value}`}
            width={60}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--surface-overlay))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value) => formatPrice(Number(value ?? 0))}
            labelStyle={{ color: "hsl(var(--muted-foreground))" }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="hsl(var(--brand))"
            strokeWidth={2}
            fill="url(#brandGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
