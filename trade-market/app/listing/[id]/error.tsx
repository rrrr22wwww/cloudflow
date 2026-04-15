"use client";

import { Button } from "@/components/ui/button";

export default function ListingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border border-loss/40 bg-loss-muted p-6 text-center">
      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-loss">Listing Error</p>
      <p className="mb-4 text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Retry</Button>
    </div>
  );
}
