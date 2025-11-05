"use client"
import type { EntityController } from "./types"

export function DataView<T>({
  controller,
}: { controller: EntityController<T> }) {
  const { items, loading, error } = controller

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Data View</h1>
          <p className="text-muted-foreground">{items.length} élément(s)</p>
        </div>
      </div>

      {error && <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>}
      {loading ? (
        <div className="space-y-2">{Array.from({length:6}).map((_,i)=><div key={i} className="h-24 rounded bg-muted animate-pulse"/>)}</div>
      ) : (
        <div className="space-y-2">
          {items.map((item: T, index: number) => (
            <div key={index} className="p-4 border rounded">
              <pre>{JSON.stringify(item, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
