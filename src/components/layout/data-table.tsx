"use client"

import { VirtualTable } from "@/components/virtual-components"
import type { ColumnDef } from "@tanstack/react-table"

interface DataTableProps<T> {
  columns?: ColumnDef<T, any>[]
  data?: T[]
  rowHeight?: number
}

export function DataTable<T>({
  columns = [],
  data = [],
  rowHeight = 44,
}: DataTableProps<T>) {
  return (
    <VirtualTable 
      columns={columns} 
      data={data} 
      rowHeight={rowHeight}
    />
  )
}
