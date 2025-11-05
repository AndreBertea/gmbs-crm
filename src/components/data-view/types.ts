export interface EntityController<T = any> {
  items: T[]
  loading: boolean
  error: string | null
  addItem: (item: T) => void
  updateItem: (id: string, updates: Partial<T>) => void
  removeItem: (id: string) => void
  refresh: () => void
}

export interface DataViewProps<T = any> {
  controller: EntityController<T>
  view: 'table' | 'grid' | 'list'
  columns?: any[]
  renderCard?: (item: T) => React.ReactNode
  renderRow?: (item: T) => React.ReactNode
}

export interface VirtualListProps<T = any> {
  items: T[]
  rowHeight: number
  renderRow: (item: T) => React.ReactNode
  className?: string
}

export interface VirtualGridProps<T = any> {
  items: T[]
  cardWidth: number
  estimateCardHeight: number
  renderCard: (item: T) => React.ReactNode
  className?: string
}

export interface VirtualTableProps<T = any> {
  items: T[]
  columns: any[]
  className?: string
}


