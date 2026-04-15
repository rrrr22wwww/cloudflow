import Link from "next/link";
import { Server, ShieldCheck, UserRoundCheck, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: UserRoundCheck,
    title: "Auth-ready",
    text: "",
  },
  {
    icon: Server,
    title: "Servers Catalog",
    text: "",
  },
  {
    icon: ShieldCheck,
    title: "Seller Flow",
    text: "",
  },
  {
    icon: Wifi,
    title: "Health Check",
    text: "",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-surface/70 p-8 md:p-14">
        <Badge>Cloudflow API Integrated</Badge>
        <h1 className="mt-4 max-w-4xl font-mono text-3xl uppercase tracking-wide md:text-5xl">
          Marketplace For Server Sales
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground md:text-base">
          UI оставлен в том же стиле, но логика теперь соответствует только
          доступным backend операциям из `apps/API_SHORT.md`.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/marketplace"
            className={buttonClasses({ variant: "primary", size: "lg" })}
          >
            Open Marketplace
          </Link>
          <Link
            href="/docs"
            className={buttonClasses({ variant: "secondary", size: "lg" })}
          >
            API Scope
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {features.map((item) => (
          <Card key={item.title} className="p-4">
            <item.icon className="mb-3 h-5 w-5 text-brand" />
            <p className="mb-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {item.title}
            </p>
            <p className="text-sm text-foreground">{item.text}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
