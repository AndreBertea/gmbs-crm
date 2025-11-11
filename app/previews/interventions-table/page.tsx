"use client"

import { useCallback, useRef, useState } from "react"

import { ScrollableTableCard } from "@/components/interventions/ScrollableTableCard"
import { InterventionsTable, type InterventionsTableColumn } from "@/components/interventions/InterventionsTable"
import { Button } from "@/components/ui/button"

type ColumnWidths = Record<string, number | undefined>

type PreviewRow = {
  id: string
  id_inter: string
  date: string
  statut: string
  client: string
  adresse: string
  metier: string
  artisan: string
}

const columns: InterventionsTableColumn<PreviewRow>[] = [
  { key: "id_inter", label: "ID", defaultWidth: 100 },
  { key: "date", label: "Date", defaultWidth: 150 },
  { key: "statut", label: "Statut", defaultWidth: 150 },
  { key: "client", label: "Client", defaultWidth: 200 },
  { key: "adresse", label: "Adresse", defaultWidth: 320 },
  { key: "metier", label: "Métier", defaultWidth: 150 },
  { key: "artisan", label: "Artisan", defaultWidth: 200 },
  {
    key: "actions",
    label: "Actions",
    defaultWidth: 100,
    resizable: false,
    sticky: "right",
  },
]

const makeDate = (index: number) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(2024, 0, index + 1))

const mockData: PreviewRow[] = Array.from({ length: 60 }).map((_, index) => ({
  id: `int-${index + 1}`,
  id_inter: `INT-${String(index + 1).padStart(4, "0")}`,
  date: makeDate(index),
  statut: ["En cours", "Terminé", "Annulé"][index % 3],
  client: `Client ${index + 1}`,
  adresse: `${index + 1} Rue de la Paix, 75001 Paris`,
  metier: ["Plomberie", "Électricité", "Chauffage"][index % 3],
  artisan: `Artisan ${index + 1}`,
}))

export default function PreviewInterventionsTablePage() {
  const tableRef = useRef<HTMLDivElement>(null)

  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() =>
    columns.reduce<ColumnWidths>((acc, column) => {
      if (column.defaultWidth) acc[column.key] = column.defaultWidth
      return acc
    }, {}),
  )

  const handleRowClick = useCallback((id: string) => {
    console.info("Row clicked:", id)
  }, [])

  const handleToggleReminder = useCallback((id: string) => {
    console.info("Toggle reminder:", id)
  }, [])

  const footer = (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{mockData.length} interventions</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          Exporter CSV
        </Button>
        <Button size="sm">Nouvelle intervention</Button>
      </div>
    </div>
  )

  return (
    <div className="container mx-auto h-screen py-6">
      <header className="mb-4 space-y-1">
        <h1 className="text-2xl font-semibold">Interventions Table (Preview)</h1>
        <p className="text-muted-foreground">
          Architecture découplée : layout, contenu et logique indépendants avec colonne Actions figée.
        </p>
      </header>

      <ScrollableTableCard ref={tableRef} footer={footer}>
        <InterventionsTable
          columns={columns}
          data={mockData}
          columnWidths={columnWidths}
          onColumnWidthsChange={setColumnWidths}
          onRowClick={handleRowClick}
          onToggleReminder={handleToggleReminder}
        />
      </ScrollableTableCard>
    </div>
  )
}
