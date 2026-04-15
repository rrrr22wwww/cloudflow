import { create } from "zustand";
import { CATEGORIES, type Category } from "@/lib/mock-data";

export interface Filters {
  category: Category[];
  priceRange: [number, number];
  sort: "featured" | "price-asc" | "price-desc" | "change-desc" | "volume-desc";
}

interface MarketStore {
  filters: Filters;
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;
  watchlist: string[];
  toggleWatchlist: (id: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
  search: string;
  setSearch: (value: string) => void;
}

const defaultFilters: Filters = {
  category: [...CATEGORIES],
  priceRange: [0, 5000],
  sort: "featured",
};

export const useMarketStore = create<MarketStore>((set) => ({
  filters: defaultFilters,
  setFilters: (partial) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...partial,
      },
    })),
  resetFilters: () => set({ filters: defaultFilters, search: "" }),
  watchlist: [],
  toggleWatchlist: (id) =>
    set((state) => ({
      watchlist: state.watchlist.includes(id)
        ? state.watchlist.filter((item) => item !== id)
        : [...state.watchlist, id],
    })),
  sidebarOpen: false,
  setSidebarOpen: (value) => set({ sidebarOpen: value }),
  search: "",
  setSearch: (value) => set({ search: value }),
}));
