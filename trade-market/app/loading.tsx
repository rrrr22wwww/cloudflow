export default function Loading() {
  return (
    <div className="space-y-4 py-8">
      <div className="h-8 w-1/3 animate-pulse rounded bg-surface-raised" />
      <div className="h-44 animate-pulse rounded-lg bg-surface-raised" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, idx) => (
          <div key={idx} className="h-36 animate-pulse rounded-lg bg-surface-raised" />
        ))}
      </div>
    </div>
  );
}
