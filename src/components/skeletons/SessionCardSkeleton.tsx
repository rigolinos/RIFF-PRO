export const SessionCardSkeleton = () => {
  return (
    <div className="glass-card overflow-hidden flex flex-col w-full h-[240px] animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="h-16 bg-white/5 border-b border-white/5 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-white/10 rounded" />
            <div className="h-3 w-20 bg-white/10 rounded" />
          </div>
        </div>
        <div className="w-16 h-6 bg-white/10 rounded-full" />
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="h-6 w-3/4 bg-white/10 rounded" />
          <div className="h-4 w-1/2 bg-white/10 rounded" />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-white/10 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-12 bg-white/10 rounded" />
              <div className="h-3 w-20 bg-white/10 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-white/10 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-12 bg-white/10 rounded" />
              <div className="h-3 w-24 bg-white/10 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
