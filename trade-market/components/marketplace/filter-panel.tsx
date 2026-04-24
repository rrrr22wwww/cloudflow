import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";

interface MarketplaceFilterPanelProps {
  showFilters: boolean;
  search: string;
  minPrice: number;
  maxPrice: number;
  onSearchChange: (value: string) => void;
  onMinPriceChange: (value: number) => void;
  onMaxPriceChange: (value: number) => void;
  onReset: () => void;
}

export function MarketplaceFilterPanel({
  showFilters,
  search,
  minPrice,
  maxPrice,
  onSearchChange,
  onMinPriceChange,
  onMaxPriceChange,
  onReset,
}: MarketplaceFilterPanelProps) {
  if (!showFilters) {
    return null;
  }

  return (
    <div className="grid gap-3 border-b border-border bg-surface/60 px-3 py-3">
      <LabeledInput
        id="filter-search"
        label="Search"
        value={search}
        onChange={onSearchChange}
        placeholder="..."
        className="h-9 px-2"
        labelClassName="grid gap-1 text-xs uppercase tracking-wider text-muted-foreground"
      />

      <LabeledInput
        id="filter-min"
        label="Min"
        type="number"
        value={minPrice}
        onChange={(value) => onMinPriceChange(Number(value) || 0)}
        className="h-9 px-2"
        labelClassName="grid gap-1 text-xs uppercase tracking-wider text-muted-foreground"
      />

      <LabeledInput
        id="filter-max"
        label="Max"
        type="number"
        value={maxPrice}
        onChange={(value) => onMaxPriceChange(Number(value) || 0)}
        className="h-9 px-2"
        labelClassName="grid gap-1 text-xs uppercase tracking-wider text-muted-foreground"
      />

      <div className="flex items-end gap-2">
        <Button size="sm" variant="secondary" onClick={onReset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
