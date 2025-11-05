export const ListSkeleton = () => (
  <div className="space-y-2">
    {Array.from({length:6}).map((_,i)=>
      <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
    )}
  </div>
)

export const GridSkeleton = () => (
  <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({length:6}).map((_,i)=>
      <div key={i} className="h-52 rounded-lg bg-muted animate-pulse" />
    )}
  </div>
)

export const TableSkeleton = () => (
  <div className="h-[60vh] rounded-md border overflow-hidden">
    <div className="h-full bg-muted/40 animate-pulse" />
  </div>
)
