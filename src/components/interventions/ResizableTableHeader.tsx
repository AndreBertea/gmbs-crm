"use client"

import type { ReactNode } from "react"

import { TableHead, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { ColumnWidths } from "@/hooks/useColumnResize"

export type ResizableHeaderColumn = {
  key: string
  label: ReactNode
  defaultWidth?: number
  resizable?: boolean
  sticky?: "left" | "right"
  headerClassName?: string
  align?: "left" | "center" | "right"
}

type ResizableTableHeaderProps = {
  columns: ResizableHeaderColumn[]
  columnWidths: ColumnWidths
  onResizeHandle: (event: React.PointerEvent<HTMLDivElement>, columnKey: string) => void
  separatorClassName?: string
}

/**
 * Table header row with draggable resize handles per column.
 * Keeps visual rendering separate from column resize logic.
 */
export function ResizableTableHeader({
  columns,
  columnWidths,
  onResizeHandle,
  separatorClassName,
}: ResizableTableHeaderProps) {
  return (
    <TableRow className="border-b border-border/60">
      {columns.map((column) => {
        const width = columnWidths[column.key] ?? column.defaultWidth ?? 150
        const isSticky = column.sticky === "right" || column.sticky === "left"
        const stickySideClass =
          column.sticky === "right"
            ? [
                "sticky right-0 z-[60]",
                "bg-muted/95 backdrop-blur-sm",
                "shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.1)]",
                "dark:shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.3)]",
              ]
            : column.sticky === "left"
              ? ["sticky left-0 z-[55]", "bg-muted/95 backdrop-blur-sm"]
              : ""

        return (
          <TableHead
            key={column.key}
            style={{ minWidth: width, width, maxWidth: width }}
            className={cn(
              "font-semibold relative",
              column.align === "center" ? "text-center" : column.align === "right" ? "text-right" : "text-left",
              isSticky ? stickySideClass : null,
              column.headerClassName,
            )}
          >
            <div className="relative flex items-center gap-2">
              <span className="truncate">{column.label}</span>
              {column.resizable !== false ? (
                <div
                  role="separator"
                  aria-hidden="true"
                  className={cn(
                    "absolute -right-3.5 top-0 h-full w-2",
                    "cursor-col-resize select-none rounded-sm",
                    "bg-border/30 transition-colors duration-200",
                    "hover:bg-primary/60",
                    separatorClassName,
                  )}
                  onPointerDown={(event) => onResizeHandle(event, column.key)}
                />
              ) : null}
            </div>
          </TableHead>
        )
      })}
    </TableRow>
  )
}

export default ResizableTableHeader
