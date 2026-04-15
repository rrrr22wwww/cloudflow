export const CATEGORIES = [
  "Art",
  "Music",
  "Gaming",
  "DeFi",
  "Collectibles",
  "Utilities",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface PricePoint {
  t: number;
  price: number;
  volume: number;
}

export interface Listing {
  id: string;
  name: string;
  description: string;
  category: Category;
  price: number;
  priceChange24h: number;
  volume24h: number;
  imageUrl: string;
  verified: boolean;
  tags: string[];
  badge: "New" | "Hot" | "Verified";
  priceHistory: PricePoint[];
}

export interface TickerStat {
  symbol: string;
  price: number;
  change24h: number;
}

export interface TradeActivityRow {
  id: string;
  asset: string;
  side: "BUY" | "SELL";
  qty: number;
  price: number;
  time: string;
}

const listingNames: Record<Category, string[]> = {
  Art: ["Neon Relic", "Vector Shrine", "Mono Reverie", "Afterglow Canvas"],
  Music: ["Wave Capsule", "Tape Echo Rights", "Sync Bloom", "Nightdrive Pack"],
  Gaming: ["Arena Skin Vault", "Legend Pass", "Shard Bundle", "Dungeon Relic"],
  DeFi: ["Yield Router", "LP Index Token", "Oracle Seat", "Vault Booster"],
  Collectibles: ["Photon Cards", "Founders Pin", "Chronicle Set", "Mythic Drop"],
  Utilities: ["Compute Credits", "API Throughput Key", "Render License", "Automation Slot"],
};

const tagMap: Record<Category, string[]> = {
  Art: ["visual", "edition", "gallery"],
  Music: ["audio", "rights", "master"],
  Gaming: ["in-game", "upgrade", "bundle"],
  DeFi: ["yield", "protocol", "liquidity"],
  Collectibles: ["limited", "series", "rarity"],
  Utilities: ["tooling", "access", "subscription"],
};

function buildPriceHistory(basePrice: number, seed: number): PricePoint[] {
  const now = Date.now();
  const points: PricePoint[] = [];
  for (let i = 0; i < 36; i += 1) {
    const wave = Math.sin((i + seed) / 4) * (basePrice * 0.04);
    const drift = (i - 18) * (basePrice * 0.0015);
    const noise = (((seed * 31 + i * 17) % 13) - 6) * (basePrice * 0.002);
    const price = Math.max(5, basePrice + wave + drift + noise);
    points.push({
      t: now - (35 - i) * 60 * 60 * 1000,
      price: Number(price.toFixed(2)),
      volume: Number((120 + ((seed * 11 + i * 9) % 90) * 1.9).toFixed(2)),
    });
  }
  return points;
}

const generatedListings: Listing[] = CATEGORIES.flatMap((category, catIndex) => {
  return listingNames[category].map((name, idx) => {
    const n = catIndex * 4 + idx;
    const basePrice = 120 + n * 85 + (catIndex + 1) * 42;
    const change = Number(((Math.sin(n + 1.5) * 7.8) + (idx - 1) * 0.8).toFixed(2));
    const history = buildPriceHistory(basePrice, n + 1);

    return {
      id: `lst-${String(n + 1).padStart(3, "0")}`,
      name,
      description: `${category} asset with instant settlement, transparent provenance, and marketplace-native liquidity.`,
      category,
      price: Number((basePrice + change * 1.5).toFixed(2)),
      priceChange24h: change,
      volume24h: Number((1300 + n * 210 + (catIndex + 1) * 95).toFixed(2)),
      imageUrl: `https://picsum.photos/seed/trade-market-${n + 1}/960/540`,
      verified: n % 2 === 0,
      tags: [...tagMap[category], idx % 2 === 0 ? "instant" : "curated"],
      badge: n % 5 === 0 ? "Hot" : n % 3 === 0 ? "New" : "Verified",
      priceHistory: history,
    };
  });
});

export const listings: Listing[] = generatedListings;

export const tickerStats: TickerStat[] = [
  { symbol: "BTC/USD", price: 67420, change24h: 2.34 },
  { symbol: "ETH/USD", price: 3492, change24h: 1.18 },
  { symbol: "SOL/USD", price: 182.37, change24h: -0.94 },
  { symbol: "CFX/IDX", price: 1240.2, change24h: 5.2 },
  { symbol: "GAME/X", price: 742.8, change24h: -1.67 },
  { symbol: "MUSIC/R", price: 519.32, change24h: 3.08 },
];

export const recentTrades: TradeActivityRow[] = listings.slice(0, 12).map((listing, idx) => {
  const side = idx % 2 === 0 ? "BUY" : "SELL";
  return {
    id: `tr-${idx + 1}`,
    asset: listing.name,
    side,
    qty: Number((0.45 + idx * 0.17).toFixed(2)),
    price: Number((listing.price * (1 + idx * 0.001)).toFixed(2)),
    time: `${(idx + 1) * 3}m ago`,
  };
});

export interface Holding {
  id: string;
  asset: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
}

export const holdings: Holding[] = listings.slice(0, 8).map((listing, idx) => {
  const quantity = Number((2 + idx * 0.75).toFixed(2));
  const avgCost = Number((listing.price * (0.82 + idx * 0.02)).toFixed(2));
  return {
    id: listing.id,
    asset: listing.name,
    quantity,
    avgCost,
    currentPrice: listing.price,
  };
});

export const portfolioHistory = Array.from({ length: 180 }, (_, idx) => {
  const base = 24000;
  const drift = idx * 48;
  const wave = Math.sin(idx / 7) * 980;
  const noise = ((idx * 17) % 13 - 6) * 42;
  return {
    day: idx + 1,
    value: Number((base + drift + wave + noise).toFixed(2)),
  };
});

export function getListingById(id: string): Listing | undefined {
  return listings.find((item) => item.id === id);
}
