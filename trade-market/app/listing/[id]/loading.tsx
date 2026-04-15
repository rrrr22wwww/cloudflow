export default function ListingLoading() {
  return (
    <div className="space-y-4">
      <div className="h-[280px] animate-pulse rounded-lg bg-surface-raised" />
      <div className="grid gap-4 xl:grid-cols-[60%_40%]">
        <div className="space-y-4">
          <div className="h-[420px] animate-pulse rounded-lg bg-surface-raised" />
          <div className="h-[280px] animate-pulse rounded-lg bg-surface-raised" />
        </div>
        <div className="space-y-4">
          <div className="h-[120px] animate-pulse rounded-lg bg-surface-raised" />
          <div className="h-[320px] animate-pulse rounded-lg bg-surface-raised" />
          <div className="h-[240px] animate-pulse rounded-lg bg-surface-raised" />
        </div>
      </div>
    </div>
  );
}
