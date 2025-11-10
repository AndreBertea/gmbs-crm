"use client"

import { useMemo } from "react"
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  format,
  parseISO,
  startOfDay,
} from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarRange, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import Loader from "@/components/ui/Loader"
import { runQuery } from "@/lib/query-engine"
import { cn } from "@/lib/utils"
import type { InterventionViewDefinition, TimelineLayoutOptions } from "@/types/intervention-views"
import type { InterventionView as InterventionEntity } from "@/types/intervention-view"
import { getPropertyLabel } from "@/types/property-schema"
import type { InterventionModalOpenOptions } from "@/hooks/useInterventionModal"

const ZOOM_LABELS: Record<NonNullable<TimelineLayoutOptions["zoom"]>, string> = {
  week: "Semaine",
  month: "Mois",
  quarter: "Trimestre",
}

const DEFAULT_ZOOM: TimelineLayoutOptions["zoom"] = "month"

const resolveValue = (intervention: InterventionEntity, property: string | undefined) => {
  if (!property) return null
  const segments = property.split(".")
  let cursor: unknown = intervention
  for (const segment of segments) {
    if (!cursor || typeof cursor !== "object" || !(segment in cursor)) {
      return null
    }
    cursor = (cursor as Record<string, unknown>)[segment]
  }
  return cursor ?? null
}

const resolveDate = (intervention: InterventionEntity, property: string | undefined) => {
  const raw = resolveValue(intervention, property)
  if (!raw) return null
  if (typeof raw === "string") {
    const parsed = parseISO(raw)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (raw instanceof Date) return raw
  return null
}

const computeTicks = (start: Date, end: Date, zoom: TimelineLayoutOptions["zoom"]) => {
  const safeZoom = zoom ?? DEFAULT_ZOOM
  if (safeZoom === "week") {
    return eachDayOfInterval({ start, end })
  }
  if (safeZoom === "month") {
    return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })
  }
  return eachMonthOfInterval({ start, end })
}

type TimelineViewConfig = InterventionViewDefinition & { layout: "timeline"; layoutOptions: TimelineLayoutOptions }

type TimelineViewProps = {
  view: TimelineViewConfig
  interventions: InterventionEntity[]
  loading: boolean
  error: string | null
  onInterventionClick?: (id: string, options?: InterventionModalOpenOptions) => void
  onLayoutOptionsChange?: (patch: Partial<TimelineLayoutOptions>) => void
}

const formatTickLabel = (date: Date, zoom: TimelineLayoutOptions["zoom"]) => {
  const safeZoom = zoom ?? DEFAULT_ZOOM
  if (safeZoom === "week") return format(date, "EEE d", { locale: fr })
  if (safeZoom === "month") return format(date, "d MMM", { locale: fr })
  return format(date, "MMM yyyy", { locale: fr })
}

const ensureDuration = (start: Date, end: Date) => {
  const diff = end.getTime() - start.getTime()
  if (diff <= 0) {
    return endOfDay(addDays(start, 1)).getTime() - start.getTime()
  }
  return diff
}

type TimelineBaseEvent = {
  intervention: InterventionEntity
  start: Date
  end: Date
  groupKey: string
}

export type TimelinePlacedEvent = TimelineBaseEvent & { laneIndex: number }

export function placeInLanes(events: TimelineBaseEvent[]): TimelinePlacedEvent[] {
  const lanes: Date[] = []
  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime())
  return sorted.map((event) => {
    let laneIndex = lanes.findIndex((laneEnd) => laneEnd.getTime() <= event.start.getTime())
    if (laneIndex === -1) {
      laneIndex = lanes.length
      lanes.push(event.end)
    } else {
      lanes[laneIndex] = event.end
    }
    return { ...event, laneIndex }
  })
}

export function TimelineView({
  view,
  interventions,
  loading,
  error,
  onInterventionClick,
  onLayoutOptionsChange,
}: TimelineViewProps) {
  const { layoutOptions } = view
  const zoom = (layoutOptions.zoom ?? DEFAULT_ZOOM) as NonNullable<TimelineLayoutOptions["zoom"]>
  const groupProperty = layoutOptions.groupBy || "statusValue"
  const dataset = useMemo(
    () => runQuery(interventions, view.filters, view.sorts),
    [interventions, view.filters, view.sorts],
  )

  const events = useMemo(() => {
    return dataset
      .map((intervention) => {
        const startDate = resolveDate(intervention, layoutOptions.startDateProperty)
        const endDate = resolveDate(intervention, layoutOptions.endDateProperty)
        if (!startDate) return null
        const safeEnd = endDate ?? endOfDay(startDate)
        return {
          intervention,
          start: startOfDay(startDate),
          end: endOfDay(safeEnd),
          groupKey: String(resolveValue(intervention, groupProperty) ?? "Sans groupe"),
        }
      })
      .filter((event): event is {
        intervention: InterventionEntity
        start: Date
        end: Date
        groupKey: string
      } => Boolean(event))
      .sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [dataset, layoutOptions.startDateProperty, layoutOptions.endDateProperty, groupProperty])

  const orderedIds = useMemo(() => {
    const unique = new Set<string>()
    events.forEach((event) => unique.add(event.intervention.id))
    return Array.from(unique)
  }, [events])

  const idToIndex = useMemo(() => {
    const map = new Map<string, number>()
    orderedIds.forEach((id, idx) => map.set(id, idx))
    return map
  }, [orderedIds])

  const range = useMemo(() => {
    if (!events.length) return null
    const start = events.reduce((min, event) => (event.start < min ? event.start : min), events[0].start)
    const end = events.reduce((max, event) => (event.end > max ? event.end : max), events[0].end)
    return { start: startOfDay(start), end: endOfDay(end) }
  }, [events])

  const ticks = useMemo(() => {
    if (!range) return []
    return computeTicks(range.start, range.end, zoom)
  }, [range, zoom])

  const groups = useMemo(() => {
    const map = new Map<string, TimelineBaseEvent[]>()
    events.forEach((event) => {
      const list = map.get(event.groupKey)
      if (list) list.push(event)
      else map.set(event.groupKey, [event])
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, "fr"))
      .map(([key, value]) => {
        const placed = placeInLanes(value)
        const laneCount = placed.reduce((max, item) => Math.max(max, item.laneIndex + 1), 0)
        return { key, events: placed, laneCount }
      })
  }, [events])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader />
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

  if (!events.length || !range) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
        Aucune intervention compatible avec la chronologie.
      </div>
    )
  }

  const totalDuration = ensureDuration(range.start, range.end)

  const handleZoomChange = (nextZoom: TimelineLayoutOptions["zoom"]) => {
    if (!nextZoom || nextZoom === zoom) return
    onLayoutOptionsChange?.({ zoom: nextZoom })
  }

  const handleGroupChange = (property: string) => {
    if (!property || property === groupProperty) return
    onLayoutOptionsChange?.({ groupBy: property })
  }

  const handleStartPropertyChange = (property: string) => {
    if (!property || property === layoutOptions.startDateProperty) return
    onLayoutOptionsChange?.({ startDateProperty: property })
  }

  const handleEndPropertyChange = (property: string) => {
    if (!property || property === layoutOptions.endDateProperty) return
    onLayoutOptionsChange?.({ endDateProperty: property })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-base font-medium text-foreground">Chronologie des interventions</div>
          <div className="text-xs text-muted-foreground">
            Période : {format(range.start, "dd MMM yyyy", { locale: fr })} → {format(range.end, "dd MMM yyyy", { locale: fr })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                Zoom ({ZOOM_LABELS[zoom] ?? ""})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {Object.entries(ZOOM_LABELS).map(([value, label]) => (
                <DropdownMenuItem key={value} onSelect={() => handleZoomChange(value as TimelineLayoutOptions["zoom"])}>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                Regrouper par
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-64 w-48">
              <ScrollArea className="h-60">
                {view.visibleProperties.map((property) => (
                  <DropdownMenuItem key={property} onSelect={() => handleGroupChange(property)}>
                    {getPropertyLabel(property)}
                  </DropdownMenuItem>
                ))}
                {!view.visibleProperties.includes("statusValue") && (
                  <DropdownMenuItem onSelect={() => handleGroupChange("statusValue")}>
                    Statut
                  </DropdownMenuItem>
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                Début
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {view.visibleProperties.map((property) => (
                <DropdownMenuItem key={property} onSelect={() => handleStartPropertyChange(property)}>
                  {getPropertyLabel(property)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                Fin
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {view.visibleProperties.map((property) => (
                <DropdownMenuItem key={property} onSelect={() => handleEndPropertyChange(property)}>
                  {getPropertyLabel(property)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card className="overflow-hidden">
        <ScrollArea className="h-[560px]">
          <div className="relative min-w-[960px] px-6 py-4">
            <div className="sticky top-0 z-10 mb-4 bg-card/95 py-2">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="w-48 shrink-0">Groupe</div>
                <div className="flex-1">
                  <div className="relative h-6 border-b border-border/60">
                    {ticks.map((tick) => {
                      const left = ((tick.getTime() - range.start.getTime()) / totalDuration) * 100
                      return (
                        <div key={tick.toISOString()} className="absolute top-0 flex h-full -translate-x-1/2 flex-col items-center">
                          <div className="h-full border-l border-border/40" />
                          <span className="mt-1 text-[10px] font-medium">
                            {formatTickLabel(tick, zoom)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.key} className="flex items-stretch gap-4">
                  <div className="w-48 shrink-0 text-sm font-medium">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span className="truncate" title={group.key}>
                        {group.key}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground/70">
                      {group.events.length} intervention{group.events.length > 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="relative flex-1">
                    <div
                      className="relative rounded-md border border-dashed border-border/50 bg-muted/20"
                      style={{ height: 48 + group.laneCount * 56 }}
                    >
                      {group.events.map((event, index) => {
                        const offset = event.start.getTime() - range.start.getTime()
                        const duration = ensureDuration(event.start, event.end)
                        const left = (offset / totalDuration) * 100
                        const width = Math.max((duration / totalDuration) * 100, 4)
                        const color = event.laneIndex % 2 === 0 ? "bg-primary/80" : "bg-secondary"
                        const top = 12 + event.laneIndex * 56
                        return (
                          <button
                            key={`${event.intervention.id}-${index}`}
                            type="button"
                             onClick={() =>
                               onInterventionClick?.(event.intervention.id, {
                                 layoutId: `timeline-event-${event.intervention.id}`,
                                 orderedIds,
                                 index: idToIndex.get(event.intervention.id) ?? 0,
                               })
                             }
                            className={cn(
                              "absolute flex h-[52px] flex-col overflow-hidden rounded-md px-2 py-1 text-left text-xs text-primary-foreground shadow-sm transition",
                              color,
                              "hover:ring-2 hover:ring-offset-2 hover:ring-offset-background",
                            )}
                            style={{ left: `${left}%`, width: `${width}%`, top }}
                          >
                            <div className="flex items-center justify-between gap-2 text-[10px] opacity-90">
                              <span>
                                {format(event.start, "dd/MM", { locale: fr })}
                                {differenceInCalendarDays(event.end, event.start) > 0
                                  ? ` → ${format(event.end, "dd/MM", { locale: fr })}`
                                  : ""}
                              </span>
                              <Badge variant="outline" className="border-white/50 px-1 text-[10px]">
                                {event.intervention.statusValue}
                              </Badge>
                            </div>
                            <div className="truncate text-xs font-medium">
                              {event.intervention.contexteIntervention || event.intervention.commentaireAgent || "Intervention"}
                            </div>
                            {event.intervention.nomClient && (
                              <div className="truncate text-[11px] opacity-90">
                                <CalendarRange className="mr-1 inline h-3 w-3" />
                                {event.intervention.prenomClient} {event.intervention.nomClient}
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </Card>
    </div>
  )
}

export default TimelineView
