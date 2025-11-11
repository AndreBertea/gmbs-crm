"use client"

import type { ReactNode } from "react"

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Bell, Eye } from "lucide-react"

import { cn } from "@/lib/utils"
import { useColumnResize, type ColumnWidths } from "@/hooks/useColumnResize"
import { ResizableTableHeader, type ResizableHeaderColumn } from "./ResizableTableHeader"

const ACTION_COLUMN_WIDTH = 100

export type InterventionsTableColumn<Row extends { id: string }> = ResizableHeaderColumn & {
  key: string
  render?: (row: Row) => ReactNode
  cellClassName?: string
}

type BaseRow = { id: string } & Record<string, unknown>

type InterventionsTableProps<Row extends BaseRow> = {
  columns: InterventionsTableColumn<Row>[]
  data: Row[]
  columnWidths: ColumnWidths
  onColumnWidthsChange: (widths: Record<string, number>) => void
  onRowClick?: (id: Row["id"]) => void
  onToggleReminder?: (id: Row["id"]) => void
  emptyState?: ReactNode
}

const DEFAULT_EMPTY_STATE = "Aucune intervention trouvée"

const getColumnWidth = <Row extends BaseRow>(
  column: InterventionsTableColumn<Row>,
  widths: ColumnWidths,
) => widths[column.key] ?? column.defaultWidth ?? (column.sticky === "right" ? ACTION_COLUMN_WIDTH : 150)

/**
 * Presentation component responsible for rendering interventions with a sticky header
 * and frozen actions column. Delegates layout and resize logic to dedicated modules.
 */
export function InterventionsTable<Row extends BaseRow>({
  columns,
  data,
  columnWidths,
  onColumnWidthsChange,
  onRowClick,
  onToggleReminder,
  emptyState,
}: InterventionsTableProps<Row>) {
  const { handlePointerDown } = useColumnResize(columnWidths, onColumnWidthsChange)

  const headerColumns: ResizableHeaderColumn[] = columns.map((column) => {
    const isActionColumn = column.sticky === "right"
    return {
      key: column.key,
      label: column.label,
      defaultWidth: isActionColumn ? column.defaultWidth ?? ACTION_COLUMN_WIDTH : column.defaultWidth,
      resizable: isActionColumn ? false : column.resizable,
      sticky: column.sticky,
      headerClassName: column.headerClassName,
      align: column.align,
    }
  })

  return (
    <Table className="w-full min-w-max" style={{ tableLayout: "fixed" }}>
      <TableHeader className="sticky top-0 z-50 bg-muted/95 backdrop-blur-sm">
        <ResizableTableHeader
          columns={headerColumns}
          columnWidths={columnWidths}
          onResizeHandle={handlePointerDown}
        />
      </TableHeader>

      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="py-12 text-center text-sm text-muted-foreground">
              {emptyState ?? DEFAULT_EMPTY_STATE}
            </TableCell>
          </TableRow>
        ) : (
          data.map((row) => (
            <TableRow
              key={row.id}
              data-row-id={row.id}
              className="border-b border-border/30 transition-colors hover:bg-muted/50"
              onClick={() => onRowClick?.(row.id)}
            >
              {columns.map((column) => {
                const width = getColumnWidth(column, columnWidths)
                const isAction = column.sticky === "right"
                const recordRow = row as Record<string, unknown>
                const renderedContent = column.render?.(row)
                const rawValue = recordRow[column.key]
                const fallbackContent =
                  renderedContent ??
                  (typeof rawValue === "undefined" || rawValue === null ? null : (rawValue as ReactNode))

                return (
                  <TableCell
                    key={`${row.id}-${column.key}`}
                    style={{ minWidth: width, width, maxWidth: width }}
                    className={cn(
                      "truncate align-middle",
                      column.align === "center"
                        ? "text-center"
                        : column.align === "right"
                          ? "text-right"
                          : "text-left",
                      column.cellClassName,
                      isAction
                        ? [
                            "sticky right-0 z-10 bg-background",
                            "shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.1)]",
                            "dark:shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.3)]",
                          ]
                        : null,
                    )}
                    onClick={isAction ? (event) => event.stopPropagation() : undefined}
                  >
                    {isAction ? (
                      renderedContent ? (
                        renderedContent
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(event) => {
                              event.stopPropagation()
                              onToggleReminder?.(row.id)
                            }}
                          >
                            <Bell className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(event) => {
                              event.stopPropagation()
                              onRowClick?.(row.id)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    ) : (
                      fallbackContent ?? "—"
                    )}
                  </TableCell>
                )
              })}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

export default InterventionsTable
