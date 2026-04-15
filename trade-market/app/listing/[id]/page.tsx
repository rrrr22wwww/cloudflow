import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="section-kicker">Server Detail</p>
      <Card className="p-6">
        <h1 className="mb-2 font-mono text-2xl uppercase tracking-wide">Server #{id}</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Детальная карточка не показывает моковые рыночные инструменты, потому что в backend пока нет order/portfolio
          API. Для просмотра сервера используйте фильтр `ID сервера` на странице marketplace.
        </p>
        <Link href="/marketplace" className={buttonClasses({ variant: "primary" })}>
          Back To Marketplace
        </Link>
      </Card>
    </div>
  );
}
