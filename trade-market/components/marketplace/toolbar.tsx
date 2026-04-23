import { cn } from "@/lib/utils";
import { MARKETPLACE_TABS, type SortTab } from "@/components/marketplace/types";

interface MarketplaceToolbarProps {
  tab: SortTab;
  onTabChange: (tab: SortTab) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

export function MarketplaceToolbar({ tab, onTabChange, showFilters, onToggleFilters }: MarketplaceToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
      <div className="flex flex-wrap gap-1">
        {MARKETPLACE_TABS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onTabChange(option.key)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors",
              tab === option.key
                ? "border-brand/30 bg-brand-muted text-brand"
                : "border-border bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onToggleFilters}
        className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        {showFilters ? "Hide Filters" : "Show Filters"}
      </button>
    </div>
  );
}
