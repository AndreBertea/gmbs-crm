"use client"

import * as React from "react"

interface VirtualGridProps<T> {
  data: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  emptyMessage?: string
  columns?: number
}

export default function VirtualGrid<T>({
  data,
  renderItem,
  className = "",
  emptyMessage = "Aucune donnée",
  columns = 3,
}: VirtualGridProps<T>) {
  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-32 text-muted-foreground ${className}`}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div 
      className={`grid gap-4 ${className}`}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {data.map((item, index) => (
        <div key={index}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  )
}
