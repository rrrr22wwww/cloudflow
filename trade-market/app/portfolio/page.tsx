import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PortfolioPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="section-kicker">Portfolio</p>
      <Card className="p-6">
        <h1 className="mb-2 font-mono text-2xl uppercase tracking-wide">Portfolio Is Disabled</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Раздел портфеля отключен в `trade-market`, чтобы UI соответствовал только текущему API. Когда в backend
          появятся реализованные операции `getOrders` и связанные метрики, этот экран можно вернуть.
        </p>
        <Link href="/marketplace" className={buttonClasses({ variant: "secondary" })}>
          Open Marketplace
        </Link>
      </Card>
    </div>
  );
}
