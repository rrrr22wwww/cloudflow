import Link from "next/link";
import Image from "next/image";
import { Cpu, HardDrive, MapPin, MemoryStick } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import type { MarketplaceItem } from "@/components/marketplace/types";
import { subtitleFromTags } from "@/components/marketplace/utils";

export function ServerCard({ item }: { item: MarketplaceItem }) {
  return (
    <Link
      href={`/listing/${item.id}`}
      className="block overflow-hidden rounded-lg border border-border bg-surface-raised transition-all duration-200 ease-spring hover:-translate-y-0.5 hover:border-brand/30"
    >
      <div className="relative aspect-[16/7] overflow-hidden bg-surface">
        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
        <div className="absolute left-2 top-2">
          <Badge>{item.category}</Badge>
        </div>
      </div>

      <div className="space-y-1.5 p-3">
        <h3 className="text-[15px] font-medium text-foreground">{item.name}</h3>
        <p className="text-xs text-muted-foreground">{subtitleFromTags(item)}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Cpu className="h-3.5 w-3.5" />
            {item.cpu || "CPU n/a"}
          </span>
          <span className="inline-flex items-center gap-1">
            <MemoryStick className="h-3.5 w-3.5" />
            {item.ram || "RAM n/a"}
          </span>
          <span className="inline-flex items-center gap-1">
            <HardDrive className="h-3.5 w-3.5" />
            {item.disk || "Disk n/a"}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {item.region || "Region n/a"}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-muted-foreground">
            {item.os ? <span>{item.os}</span> : null}
          </div>
          <p className="font-mono text-foreground">{formatPrice(item.price)} / month</p>
        </div>
      </div>
    </Link>
  );
}
