import { NextResponse } from "next/server";
import {
  CLOUD_GQL,
  type CloudflowCategory,
  type CloudflowProduct,
  CloudflowApiError,
  cloudflowGraphql,
} from "@/lib/cloudflow-api";
import { parseServerSpecs } from "@/lib/server-specs";

type SortTab = "popular" | "new" | "top-rated" | "recently-updated";

interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  previewImage?: string;
  sellerId: string;
  price: number;
  rating: number;
  cpu: string;
  ram: string;
  disk: string;
  region: string;
  traffic: string;
  os: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

function parseRating(value?: number | null) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(5, Number(value.toFixed(1))));
  }

  return 0;
}

function toTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function toCategoryMap(categories: CloudflowCategory[]) {
  return new Map(categories.map((category) => [category.id, category.name]));
}

function toMarketplaceItem(
  product: CloudflowProduct,
  categoryMap: Map<number, string>,
): MarketplaceItem {
  const specs = parseServerSpecs(product.tags);

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category:
      (typeof product.category_id === "number"
        ? categoryMap.get(product.category_id)
        : undefined) ?? "Uncategorized",
    imageUrl: product.preview_image || `https://picsum.photos/seed/server-${product.id}/960/540`,
    previewImage: product.preview_image ?? undefined,
    sellerId: product.seller_id,
    price: product.price,
    rating: parseRating(product.rating),
    cpu: specs.cpu,
    ram: specs.ram,
    disk: specs.disk,
    region: specs.region,
    traffic: specs.traffic,
    os: specs.os,
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
      return [...items].sort(
        (a, b) =>
          b.rating * 1000 +
          toTimestamp(b.updatedAt) -
          (a.rating * 1000 + toTimestamp(a.updatedAt)),
      );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      search?: string;
      category?: string;
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

    const [productsResponse, categoriesResponse] = await Promise.all([
      cloudflowGraphql<{ getProducts: CloudflowProduct[] }>(
        CLOUD_GQL.getProducts,
        {
          name: search.length > 0 ? search : undefined,
        },
        body.token,
      ),
      cloudflowGraphql<{ getCategories: CloudflowCategory[] }>(
        CLOUD_GQL.getCategories,
        {},
        body.token,
      ),
    ]);

    const categoryMap = toCategoryMap(categoriesResponse.data?.getCategories ?? []);
    const source = (productsResponse.data?.getProducts ?? [])
      .filter((product) => (product.status ?? "active") === "active")
      .map((product) =>
      toMarketplaceItem(product, categoryMap),
    );

    const categoryNames = ["All Servers", ...new Set(source.map((item) => item.category))];
    const categories = categoryNames.map((name) => {
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
        const text = `${item.name} ${item.description} ${item.category} ${item.cpu} ${item.ram} ${item.disk} ${item.region} ${item.os} ${item.tags.join(" ")}`.toLowerCase();
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
      return NextResponse.json(
        { message: error.message, payload: error.payload },
        { status: error.status || 500 },
      );
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
