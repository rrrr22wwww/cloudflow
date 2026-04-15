export default function MarketplaceLoading() {
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="hidden h-96 animate-pulse rounded-lg bg-surface-raised lg:block" />
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded bg-surface-raised" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, idx) => (
            <div key={idx} className="h-[320px] animate-pulse rounded-lg bg-surface-raised" />
          ))}
        </div>
      </div>
    </div>
  );
}
