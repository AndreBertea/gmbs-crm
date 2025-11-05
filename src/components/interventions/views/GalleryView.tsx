"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { AnimatePresence, LayoutGroup, motion } from "framer-motion"
import { Calendar, MapPin, User, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { runQuery } from "@/lib/query-engine"
import { cn } from "@/lib/utils"
import type { InterventionViewDefinition } from "@/types/intervention-views"
import type { InterventionView as InterventionEntity } from "@/types/intervention-view"
import type { GalleryLayoutOptions } from "@/types/intervention-views"
import type { InterventionModalOpenOptions } from "@/hooks/useInterventionModal"

const sizeToGridClass: Record<GalleryLayoutOptions["size"], string> = {
  small: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  medium: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  large: "grid-cols-1 sm:grid-cols-2",
}

const sizeToCardHeight: Record<GalleryLayoutOptions["size"], string> = {
  small: "h-44",
  medium: "h-56",
  large: "h-72",
}

const sizeToImageHeight: Record<GalleryLayoutOptions["size"], number> = {
  small: 96,
  medium: 128,
  large: 160,
}

type GalleryViewConfig = InterventionViewDefinition & { layout: "gallery"; layoutOptions: GalleryLayoutOptions }

type GalleryViewProps = {
  view: GalleryViewConfig
  interventions: InterventionEntity[]
  loading: boolean
  error: string | null
  onInterventionClick?: (id: string, options?: InterventionModalOpenOptions) => void
  onLayoutOptionsChange?: (options: Partial<GalleryLayoutOptions>) => void
}

const fallbackCoverGradients = [
  "from-sky-200 via-sky-100 to-sky-50",
  "from-rose-200 via-rose-100 to-rose-50",
  "from-emerald-200 via-emerald-100 to-emerald-50",
  "from-amber-200 via-amber-100 to-amber-50",
]

const formatDate = (value?: string | null) => {
  if (!value) return "Date inconnue"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Date invalide" : date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

const propertyValue = (intervention: InterventionEntity, property?: string | null) => {
  if (!property) return null
  const path = property.split(".")
  let current: unknown = intervention as unknown
  for (const segment of path) {
    if (current && typeof current === "object" && segment in current) {
      current = (current as Record<string, unknown>)[segment]
    } else {
      return null
    }
  }
  return current
}

export function GalleryView({
  view,
  interventions,
  loading,
  error,
  onInterventionClick,
  onLayoutOptionsChange,
}: GalleryViewProps) {
  const { layoutOptions } = view
  const cardSizeClass = sizeToCardHeight[layoutOptions.size]
  const gridClass = sizeToGridClass[layoutOptions.size]
  const imageHeight = sizeToImageHeight[layoutOptions.size]
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const dataset = useMemo(
    () => runQuery(interventions, view.filters, view.sorts),
    [interventions, view.filters, view.sorts],
  )
  const orderedIds = useMemo(() => dataset.map((item) => item.id), [dataset])

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-48 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (!dataset.length) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
        Aucune intervention à afficher pour cette vue.
      </div>
    )
  }

  const previewPropertyValue = (item: InterventionEntity) => {
    const value = propertyValue(item, layoutOptions.previewProperty)
    if (value == null || value === "") return item.contexteIntervention || item.commentaireAgent || "Intervention"
    return String(value)
  }

  const highlightedProperties = layoutOptions.highlightedProperties?.length
    ? layoutOptions.highlightedProperties
    : view.visibleProperties.filter((prop) => prop !== layoutOptions.previewProperty).slice(0, 3)

  const handleSizeChange = (size: GalleryLayoutOptions["size"]) => {
    if (size === layoutOptions.size) return
    onLayoutOptionsChange?.({ size })
  }

  const handlePreviewPropertyChange = (property: string) => {
    if (property === layoutOptions.previewProperty) return
    onLayoutOptionsChange?.({ previewProperty: property })
  }

  const handleCardClick = (id: string) => {
    const layoutId = `gallery-card-${id}`
    setSelectedId(id)
    onInterventionClick?.(id, { layoutId })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">Vue galerie — cartes {layoutOptions.size}</div>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 rounded-full border border-border/60 px-1 py-0.5 text-xs">
            {(["small", "medium", "large"] as GalleryLayoutOptions["size"][]).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => handleSizeChange(size)}
                className={cn(
                  "rounded-full px-2 py-1 capitalize transition",
                  layoutOptions.size === size ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {size === "small" ? "S" : size === "medium" ? "M" : "L"}
              </button>
            ))}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                Prévisualisation
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-60 w-48">
              <ScrollArea className="h-48">
                {view.visibleProperties.map((property) => (
                  <DropdownMenuItem key={property} onSelect={() => handlePreviewPropertyChange(property)}>
                    {property}
                  </DropdownMenuItem>
                ))}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <LayoutGroup>
        <div className={cn("grid gap-4", gridClass)}>
          {dataset.map((item, index) => {
            const coverValue = propertyValue(item, layoutOptions.coverProperty)
            const coverUrl = typeof coverValue === "string" && coverValue.startsWith("http") ? coverValue : null
            const preview = previewPropertyValue(item)
            const gradientClass = fallbackCoverGradients[index % fallbackCoverGradients.length]

            return (
              <motion.div
                key={item.id}
                layout
                layoutId={`gallery-card-${item.id}`}
                className={cn("group cursor-pointer overflow-hidden", cardSizeClass)}
                whileHover={{ scale: 1.015 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                onClick={() => handleCardClick(item.id)}
              >
                <Card className="h-full border-border/60">
                  {coverUrl ? (
                    <div className="relative w-full" style={{ height: imageHeight }}>
                      <Image
                        src={coverUrl}
                        alt={preview}
                        fill
                        className="object-cover"
                        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "flex items-center justify-center bg-gradient-to-br text-sm font-medium text-foreground/80",
                        gradientClass,
                      )}
                      style={{ height: imageHeight }}
                    >
                      {item.nomClient || item.prenomClient || "Intervention"}
                    </div>
                  )}
                  <CardContent className="flex h-full flex-col gap-3 p-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(item.dateIntervention || item.date)}
                        </span>
                        <Badge variant="outline">{item.statusValue}</Badge>
                      </div>
                      <div className="mt-1 text-sm font-medium leading-tight text-foreground line-clamp-2">
                        {preview}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {highlightedProperties.map((property) => {
                        const value = propertyValue(item, property)
                        if (value == null || value === "") return null
                        if (property === "attribueA") {
                          const code =
                            item.assignedUserCode ??
                            (typeof value === "string" ? value : value == null ? "" : String(value))
                          const displayCode = code || "Non assigné"
                          return (
                            <span key={property} className="inline-flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              {displayCode}
                            </span>
                          )
                        }
                        if (property.includes("adresse")) {
                          return (
                            <span key={property} className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {String(value)}
                            </span>
                          )
                        }
                        return (
                          <Badge key={property} variant="secondary" className="rounded-full px-2 py-0.5 text-xs">
                            {String(value)}
                          </Badge>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        <AnimatePresence>
          {selectedId && (
            <motion.div
              className="modal-overlay z-40 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedId(null)}
            >
              <motion.div
                layoutId={`gallery-card-${selectedId}`}
                className="modal-content relative mx-4 max-h-[90vh] w-full max-w-3xl overflow-hidden p-0"
                onClick={(event) => event.stopPropagation()}
              >
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-3 top-3 z-10 h-8 w-8"
                  onClick={() => setSelectedId(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
                {(() => {
                  const item = dataset.find((entry) => entry.id === selectedId)
                  if (!item) return null
                  const coverValue = propertyValue(item, layoutOptions.coverProperty)
                  const coverUrl = typeof coverValue === "string" && coverValue.startsWith("http") ? coverValue : null
                  const preview = previewPropertyValue(item)
                  return (
                    <>
                      {coverUrl && (
                        <div className="relative h-64 w-full">
                          <Image src={coverUrl} alt={preview} fill className="object-cover" />
                        </div>
                      )}
                      <CardContent className="space-y-4 p-6">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">{item.statusValue}</Badge>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(item.dateIntervention || item.date)}
                          </span>
                        </div>
                        <h3 className="text-xl font-semibold leading-tight">{preview}</h3>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          {highlightedProperties.map((property) => {
                            const value = propertyValue(item, property)
                            if (value == null || value === "") return null
                            return (
                              <div key={property} className="flex items-center gap-2">
                                <span className="font-medium text-foreground">{property}</span>
                                <span>{String(value)}</span>
                              </div>
                            )
                          })}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setSelectedId(null)}>
                            Fermer
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedId(null)
                              onInterventionClick?.(item.id, {
                                layoutId: `gallery-card-${item.id}`,
                                modeOverride: "centerpage",
                                orderedIds,
                                index: Math.max(0, orderedIds.indexOf(item.id)),
                              })
                            }}
                          >
                            Ouvrir la fiche
                          </Button>
                        </div>
                      </CardContent>
                    </>
                  )
                })()}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  )
}

export default GalleryView
