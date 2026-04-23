import { Card } from "@/components/ui/card";

export function MarketplaceHero() {
  return (
    <Card className="overflow-hidden border-border/80 bg-[linear-gradient(180deg,hsl(var(--surface-overlay)/0.8),hsl(var(--surface)/0.6))] p-8 text-center">
      <h1 className="font-mono text-3xl uppercase tracking-wide text-brand md:text-4xl">
        Discover & Rent Game Servers
      </h1>
      <p className="mx-auto mt-3 max-w-3xl text-sm text-muted-foreground md:text-base">
        Browse community listings or publish your own server. Instant setup, global reach.
      </p>
    </Card>
  );
}
