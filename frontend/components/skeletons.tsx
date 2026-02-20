export function PoolCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card/50 p-6 lg:p-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 w-28 rounded-lg bg-secondary" />
          <div className="mt-2 h-4 w-20 rounded-lg bg-secondary/60" />
        </div>
        <div className="h-7 w-24 rounded-full bg-secondary" />
      </div>
      <div className="mt-6 mb-6">
        <div className="h-4 w-20 rounded bg-secondary/60 mb-2" />
        <div className="h-10 w-32 rounded-lg bg-secondary" />
      </div>
      <div className="grid grid-cols-3 gap-4 rounded-xl bg-secondary/50 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-3 w-10 rounded bg-secondary/80 mb-1.5" />
            <div className="h-5 w-14 rounded bg-secondary" />
          </div>
        ))}
      </div>
      <div className="mt-6 h-12 rounded-lg bg-secondary" />
    </div>
  )
}

export function PoolGridSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <PoolCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Wallet card */}
      <div className="rounded-2xl border border-border bg-card/50 p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-secondary" />
          <div>
            <div className="h-4 w-32 rounded bg-secondary mb-1.5" />
            <div className="h-3 w-24 rounded bg-secondary/60" />
          </div>
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card/50 p-5">
            <div className="h-3 w-16 rounded bg-secondary/60 mb-3" />
            <div className="h-6 w-24 rounded bg-secondary" />
          </div>
        ))}
      </div>
      {/* Table */}
      <div className="rounded-2xl border border-border bg-card/50 p-6">
        <div className="h-5 w-32 rounded bg-secondary mb-6" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 py-4">
            <div className="h-9 w-9 rounded-lg bg-secondary" />
            <div className="flex-1">
              <div className="h-4 w-24 rounded bg-secondary mb-1.5" />
              <div className="h-3 w-16 rounded bg-secondary/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DrawsSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="grid gap-4 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card/50 p-5">
            <div className="h-5 w-24 rounded bg-secondary mb-3" />
            <div className="flex items-center justify-between">
              <div className="h-8 w-20 rounded bg-secondary" />
              <div className="h-6 w-24 rounded bg-secondary" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-card/50 p-6">
        <div className="h-5 w-40 rounded bg-secondary mb-4" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 py-4 border-b border-border/30 last:border-0">
            <div className="h-10 w-10 rounded-xl bg-secondary" />
            <div className="flex-1">
              <div className="h-4 w-32 rounded bg-secondary mb-1.5" />
              <div className="h-3 w-20 rounded bg-secondary/60" />
            </div>
            <div className="h-6 w-16 rounded bg-secondary" />
          </div>
        ))}
      </div>
    </div>
  )
}
