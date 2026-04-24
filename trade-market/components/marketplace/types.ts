export type SortTab = "popular" | "new" | "top-rated" | "recently-updated";

export type MarketplaceItem = {
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
};

export type CategoryRow = {
  name: string;
  count: number;
};

export type MarketplaceResponse = {
  total: number;
  items: MarketplaceItem[];
  categories: CategoryRow[];
  recent: MarketplaceItem[];
};

export const MARKETPLACE_TABS: Array<{ key: SortTab; label: string }> = [
  { key: "popular", label: "Popular" },
  { key: "new", label: "New" },
  { key: "top-rated", label: "Top Rated" },
  { key: "recently-updated", label: "Recently Updated" },
];
