import { Card } from "@/components/ui/card";

export function MarketplaceHero() {
  return (
    <Card className="overflow-hidden border-border/80 bg-[linear-gradient(180deg,hsl(var(--surface-overlay)/0.8),hsl(var(--surface)/0.6))] p-6 text-center md:p-8">
      <h1 className="font-mono text-2xl uppercase tracking-wide text-brand md:text-3xl">
        Discover & Buy Cloud Servers
      </h1>
      <p className="mx-auto mt-3 max-w-3xl text-xs text-muted-foreground md:text-sm">
        Browse dedicated servers and VPS listings or publish your own infrastructure offer.
      </p>
    </Card>
  );
}
