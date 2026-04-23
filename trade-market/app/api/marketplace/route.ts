import { NextResponse } from "next/server";
import { CLOUD_GQL, type CloudflowProduct, CloudflowApiError, cloudflowGraphql } from "@/lib/cloudflow-api";

const CATEGORY_ORDER = [
  "All Servers",
  "Minecraft",
  "Rust",
  "Garry's Mod",
  "ARK: Survival",
  "FiveM",
  "Palworld",
  "Valheim",
  "CS2",
  "7 Days to Die",
  "Other",
] as const;

type CategoryName = (typeof CATEGORY_ORDER)[number];
type SortTab = "popular" | "new" | "top-rated" | "recently-updated";

interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  category: CategoryName;
  imageUrl: string;
  sellerId: string;
  price: number;
  rating: number;
  players: number;
  capacity: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

function pickCategory(product: CloudflowProduct): CategoryName {
  const text = `${product.name} ${(product.tags ?? []).join(" ")} ${product.description}`.toLowerCase();

  if (text.includes("minecraft")) return "Minecraft";
  if (text.includes("rust")) return "Rust";
  if (text.includes("garry") || text.includes("gmod")) return "Garry's Mod";
  if (text.includes("ark")) return "ARK: Survival";
  if (text.includes("fivem") || text.includes("five m") || text.includes("rp")) return "FiveM";
  if (text.includes("palworld")) return "Palworld";
  if (text.includes("valheim")) return "Valheim";
  if (text.includes("cs2") || text.includes("counter strike")) return "CS2";
  if (text.includes("7 days") || text.includes("7dtd")) return "7 Days to Die";

  return "Other";
}

function parseSlots(tags?: string[] | null, seed = 0) {
  if (!tags?.length) {
    const capacity = 24 + (seed % 6) * 16;
    return { players: Math.max(2, Math.round(capacity * 0.45)), capacity };
  }

  for (const raw of tags) {
    const value = raw.toLowerCase().trim();
    if (value.includes("/") && (value.includes("slots") || value.includes("players") || value.includes("online"))) {
      const match = value.match(/(\d+)\s*\/\s*(\d+)/);
      if (match) {
        return {
          players: Number(match[1]),
          capacity: Number(match[2]),
        };
      }
    }
  }

  const capacity = 32 + (seed % 8) * 12;
  return { players: Math.max(2, Math.round(capacity * 0.4)), capacity };
}

function parseRating(value?: number | null, seed = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(3.9, Math.min(5, Number(value.toFixed(1))));
  }

  return Number((4.2 + (seed % 8) * 0.1).toFixed(1));
}

function toTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function toMarketplaceItem(product: CloudflowProduct, idx: number): MarketplaceItem {
  const slots = parseSlots(product.tags, idx);
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category: pickCategory(product),
    imageUrl: `https://picsum.photos/seed/server-${product.id}/960/540`,
    sellerId: product.seller_id,
    price: product.price,
    rating: parseRating(product.rating, idx),
    players: slots.players,
    capacity: slots.capacity,
    tags: product.tags ?? [],
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

function sortItems(items: MarketplaceItem[], tab: SortTab) {
  switch (tab) {
    case "new":
      return [...items].sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));
    case "top-rated":
      return [...items].sort((a, b) => b.rating - a.rating);
    case "recently-updated":
      return [...items].sort((a, b) => toTimestamp(b.updatedAt) - toTimestamp(a.updatedAt));
    default:
      return [...items].sort((a, b) => b.rating * (b.players + 1) - a.rating * (a.players + 1));
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      search?: string;
      category?: CategoryName;
      tab?: SortTab;
      minPrice?: number;
      maxPrice?: number;
      limit?: number;
    };

    if (!body.token) {
      return NextResponse.json({ message: "token is required" }, { status: 400 });
    }

    const search = body.search?.trim() ?? "";
    const category = body.category ?? "All Servers";
    const tab = body.tab ?? "popular";
    const minPrice = typeof body.minPrice === "number" ? body.minPrice : 0;
    const maxPrice = typeof body.maxPrice === "number" ? body.maxPrice : Number.MAX_SAFE_INTEGER;
    const limit = typeof body.limit === "number" ? Math.max(6, Math.min(60, body.limit)) : 24;

    const gql = await cloudflowGraphql<{ getProducts: CloudflowProduct[] }>(
      CLOUD_GQL.getProducts,
      {
        name: search.length > 0 ? search : undefined,
      },
      body.token,
    );

    const source = (gql.data?.getProducts ?? []).map(toMarketplaceItem);

    const categories = CATEGORY_ORDER.map((name) => {
      const count =
        name === "All Servers" ? source.length : source.filter((item) => item.category === name).length;
      return { name, count };
    });

    let filtered = source.filter((item) => item.price >= minPrice && item.price <= maxPrice);

    if (category !== "All Servers") {
      filtered = filtered.filter((item) => item.category === category);
    }

    if (search.length > 0) {
      const normalized = search.toLowerCase();
      filtered = filtered.filter((item) => {
        const text = `${item.name} ${item.description} ${item.tags.join(" ")}`.toLowerCase();
        return text.includes(normalized);
      });
    }

    const sorted = sortItems(filtered, tab);
    const items = sorted.slice(0, limit);

    const recent = [...source]
      .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
      .slice(0, 5);

    return NextResponse.json({
      total: filtered.length,
      items,
      categories,
      recent,
    });
  } catch (error) {
    if (error instanceof CloudflowApiError) {
      return NextResponse.json({ message: error.message, payload: error.payload }, { status: error.status || 500 });
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
