import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CategoryRow } from "@/components/marketplace/types";

interface CategorySidebarProps {
  categories: CategoryRow[];
  activeCategory: string;
  onSelect: (category: string) => void;
}

let ls: CategoryRow[] = [];

for (let i = 0; i < 10; i++) {
  ls.push({
    name: `category ${i}`,
    count: Math.floor(Math.random() * 100),
  });
}

export function CategorySidebar({
  categories,
  activeCategory,
  onSelect,
}: CategorySidebarProps) {
  return (
    <Card className="p-3">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
        Categories
      </p>
      <div className="space-y-1.5">
        {ls.length === 0 ? (
          <p className="rounded-md border border-border bg-surface px-2 py-2 text-xs text-muted-foreground">
            No categories yet
          </p>
        ) : (
          ls.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => onSelect(item.name)}
              className={cn(
                "flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-sm transition-colors",
                activeCategory === item.name
                  ? "border-brand/30 bg-brand-muted text-brand"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              <span>{item.name}</span>
              <span className="font-mono text-xs">{item.count}</span>
            </button>
          ))
        )}
      </div>
    </Card>
  );
}
