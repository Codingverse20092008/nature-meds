export function ProductGridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="card-shell space-y-4">
          <div className="skeleton h-6 w-28" />
          <div className="skeleton h-16 w-16 rounded-3xl" />
          <div className="skeleton h-7 w-2/3" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-4/5" />
          <div className="skeleton h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="card-shell flex items-center gap-4">
          <div className="skeleton h-12 w-12 rounded-2xl" />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-4 w-2/5" />
            <div className="skeleton h-4 w-3/5" />
          </div>
          <div className="skeleton h-10 w-24" />
        </div>
      ))}
    </div>
  );
}
