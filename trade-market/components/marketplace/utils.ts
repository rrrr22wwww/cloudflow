import type { MarketplaceItem } from "@/components/marketplace/types";

export function formatAgo(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "just now";
  }

  const diff = Date.now() - parsed;
  const minutes = Math.max(1, Math.floor(diff / 60000));

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function subtitleFromTags(item: MarketplaceItem) {
  const specs = [item.cpu, item.ram, item.disk].filter(Boolean);
  if (specs.length > 0) {
    return specs.join(" • ");
  }

  if (item.tags.length > 0) {
    return item.tags
      .slice(0, 2)
      .map((tag) => tag.replace(":", " · "))
      .join(" • ");
  }

  return item.category;
}
