export function GameCardSkeleton() {
  return (
    <div aria-hidden="true" className="glass-card rounded-lg p-2">
      <div className="skeleton aspect-[3/4] rounded-md" />
      <div className="space-y-2 px-1.5 pb-1 pt-3">
        <div className="skeleton h-4 w-4/5 rounded-xs" />
        <div className="skeleton h-3.5 w-1/3 rounded-xs" />
        <div className="flex items-center justify-between pt-3">
          <div className="skeleton h-5 w-20 rounded-xs" />
          <div className="skeleton size-10 rounded-pill" />
        </div>
      </div>
    </div>
  );
}
