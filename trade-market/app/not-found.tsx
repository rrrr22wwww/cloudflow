import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto mt-20 max-w-md rounded-lg border border-border bg-surface-raised p-6 text-center">
      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">404</p>
      <h2 className="mb-3 text-xl font-medium">Listing not found</h2>
      <p className="mb-5 text-sm text-muted-foreground">The requested asset may have been removed from the market.</p>
      <Link href="/marketplace" className={buttonClasses({ variant: "primary" })}>
        Back to Marketplace
      </Link>
    </div>
  );
}
