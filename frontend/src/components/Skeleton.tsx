export function SkeletonBuildCard() {
  return (
    <div className="rounded-2xl border border-hairline bg-paper p-3 space-y-3 animate-pulse">
      <div className="aspect-[4/3] bg-surface rounded-xl" />
      <div className="h-4 bg-surface rounded-md w-3/4" />
      <div className="h-3 bg-surface rounded-md w-1/2" />
      <div className="h-8 bg-surface rounded-xl" />
    </div>
  );
}

export function SkeletonBuildGrid({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBuildCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`bg-surface rounded-md animate-pulse ${className}`} />;
}

export function SkeletonAvatar({ size = 'w-20 h-20' }: { size?: string }) {
  return <div className={`${size} rounded-full bg-surface animate-pulse`} />;
}

export function SkeletonProfileHeader() {
  return (
    <div>
      <div className="w-full h-56 md:h-72 rounded-2xl bg-surface animate-pulse" />
      <div className="flex items-end gap-4 -mt-12 px-2">
        <SkeletonAvatar />
        <div className="mb-2 space-y-2">
          <SkeletonLine className="h-6 w-40" />
          <SkeletonLine className="h-4 w-56" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonBuildDetail() {
  return (
    <div className="space-y-6">
      <div className="aspect-[16/9] rounded-2xl bg-surface animate-pulse" />
      <div className="space-y-3">
        <SkeletonLine className="h-8 w-1/2" />
        <SkeletonLine className="h-4 w-1/3" />
      </div>
      <div className="rounded-2xl border border-hairline overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className={`p-4 flex items-center justify-between ${
              i !== 0 ? 'border-t border-hairline' : ''
            }`}
          >
            <SkeletonLine className="h-4 w-40" />
            <SkeletonLine className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
