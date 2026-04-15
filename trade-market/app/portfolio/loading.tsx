export default function PortfolioLoading() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, idx) => (
          <div key={idx} className="h-28 animate-pulse rounded-lg bg-surface-raised" />
        ))}
      </div>
      <div className="h-[320px] animate-pulse rounded-lg bg-surface-raised" />
      <div className="h-[340px] animate-pulse rounded-lg bg-surface-raised" />
    </div>
  );
}
