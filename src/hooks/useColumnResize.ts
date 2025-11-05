"use client"

import { useCallback, useEffect, useState } from "react"

export function useColumnResize(
  columnWidths: Record<string, number | undefined>,
  onUpdate: (widths: Record<string, number>) => void,
) {
  const [activeColumn, setActiveColumn] = useState<string | null>(null)
  const [startX, setStartX] = useState(0)
  const [startWidth, setStartWidth] = useState(0)

  const handlePointerDown = useCallback(
    (event: React.PointerEvent, column: string) => {
      event.preventDefault()
      const width = columnWidths[column] ?? 150
      setActiveColumn(column)
      setStartX(event.clientX)
      setStartWidth(width)
    },
    [columnWidths],
  )

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!activeColumn) return
      const delta = event.clientX - startX
      const nextWidth = Math.max(80, startWidth + delta)
      const draft: Record<string, number | undefined> = {
        ...columnWidths,
        [activeColumn]: nextWidth,
      }
      const sanitized: Record<string, number> = {}
      Object.entries(draft).forEach(([key, value]) => {
        if (typeof value === "number" && Number.isFinite(value)) {
          sanitized[key] = value
        }
      })
      onUpdate(sanitized)
    },
    [activeColumn, columnWidths, onUpdate, startWidth, startX],
  )

  const handlePointerUp = useCallback(() => {
    setActiveColumn(null)
  }, [])

  useEffect(() => {
    if (!activeColumn) return
    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerUp)
    return () => {
      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)
    }
  }, [activeColumn, handlePointerMove, handlePointerUp])

  return {
    activeColumn,
    handlePointerDown,
  }
}

export default useColumnResize
