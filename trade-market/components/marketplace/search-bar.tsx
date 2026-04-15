"use client";

import { Search } from "lucide-react";
import { Command } from "cmdk";
import { cn } from "@/lib/utils";

export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-md border border-border bg-surface-overlay/60 px-3 py-1.5">
      <Command shouldFilter={false} className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Command.Input
          value={value}
          onValueChange={onChange}
          placeholder="Search listings, tags, categories..."
          className={cn(
            "h-8 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground",
            "font-mono",
          )}
          aria-label="Search listings"
        />
      </Command>
    </div>
  );
}
