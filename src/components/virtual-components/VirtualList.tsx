"use client"

import * as React from "react"

interface VirtualListProps<T> {
  data: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  emptyMessage?: string
}

export function VirtualList<T>({
  data,
  renderItem,
  className = "",
  emptyMessage = "Aucune donnée",
}: VirtualListProps<T>) {
  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-32 text-muted-foreground ${className}`}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {data.map((item, index) => (
        <div key={index}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  )
}
