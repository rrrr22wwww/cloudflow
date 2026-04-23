"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { MarketplaceHero } from "@/components/marketplace/hero";
import { CategorySidebar } from "@/components/marketplace/category-sidebar";
import { MarketplaceToolbar } from "@/components/marketplace/toolbar";
import { MarketplaceFilterPanel } from "@/components/marketplace/filter-panel";
import { ServerCard } from "@/components/marketplace/server-card";
import { RecentPublishedList } from "@/components/marketplace/recent-list";
import type {
  MarketplaceResponse,
  SortTab,
} from "@/components/marketplace/types";

const TOKEN_KEY = "trade_market_cloudflow_token";

function getStoredToken() {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(TOKEN_KEY) ?? "";
}

export default function MarketplacePage() {
  const [token, setToken] = useState(() => getStoredToken());
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Servers");
  const [tab, setTab] = useState<SortTab>("popular");
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(30000);

  const [data, setData] = useState<MarketplaceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(() => data?.categories ?? [], [data]);
  const activeCount = data?.total ?? 0;

  useEffect(() => {
    if (!token) {
      setData(null);
      setError("JWT required: open Account flow and paste token, then save.");
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/marketplace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            search,
            category,
            tab,
            minPrice,
            maxPrice,
            limit: 24,
          }),
          signal: controller.signal,
        });

        const payload = (await response.json()) as
          | MarketplaceResponse
          | { message?: string };

        if (!response.ok) {
          const message =
            (payload as { message?: string }).message ??
            "Marketplace request failed";
          throw new Error(message);
        }

        if (!cancelled) {
          setData(payload as MarketplaceResponse);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token, search, category, tab, minPrice, maxPrice]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncToken = () => setToken(getStoredToken());
    const onStorage = (event: StorageEvent) => {
      if (event.key === TOKEN_KEY) {
        syncToken();
      }
    };
    const onAuthEvent = () => syncToken();

    window.addEventListener("storage", onStorage);
    window.addEventListener(
      "cloudflow-auth-updated",
      onAuthEvent as EventListener,
    );

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "cloudflow-auth-updated",
        onAuthEvent as EventListener,
      );
    };
  }, []);

  return (
    <div className="space-y-4">
      <MarketplaceHero />

      <div className="grid gap-4 xl:grid-cols-[220px_1fr]">
        <aside>
          <CategorySidebar
            categories={categories}
            activeCategory={category}
            onSelect={setCategory}
          />
        </aside>

        <section className="space-y-3">
          <Card className="p-0">
            <MarketplaceToolbar
              tab={tab}
              onTabChange={setTab}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters((prev) => !prev)}
            />

            <MarketplaceFilterPanel
              showFilters={showFilters}
              search={search}
              minPrice={minPrice}
              maxPrice={maxPrice}
              onSearchChange={setSearch}
              onMinPriceChange={setMinPrice}
              onMaxPriceChange={setMaxPrice}
              onReset={() => {
                setSearch("");
                setMinPrice(0);
                setMaxPrice(30000);
              }}
            />

            <div className="px-3 py-2 text-xs text-muted-foreground">
              {loading ? "Loading..." : `${activeCount} servers found`}{" "}
              {error ? `· ${error}` : ""}
            </div>

            <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-2 2xl:grid-cols-3">
              {data?.items.map((item) => (
                <ServerCard key={item.id} item={item} />
              ))}
            </div>
          </Card>

          <RecentPublishedList items={data?.recent ?? []} />
        </section>
      </div>
    </div>
  );
}
