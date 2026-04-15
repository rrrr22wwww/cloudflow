"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto mt-20 max-w-lg rounded-lg border border-loss/40 bg-loss-muted p-6 text-center">
      <h2 className="mb-2 font-mono text-sm uppercase tracking-widest text-loss">Something went wrong</h2>
      <p className="mb-4 text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset} variant="secondary">
        Retry
      </Button>
    </div>
  );
}
