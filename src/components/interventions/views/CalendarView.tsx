"use client"

import { useMemo, useState } from "react"
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { fr } from "date-fns/locale"
import { Calendar as CalendarIcon, Clock, CornerDownRight, MapPin, User } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { runQuery } from "@/lib/query-engine"
import { cn } from "@/lib/utils"
import type { CalendarLayoutOptions, InterventionViewDefinition } from "@/types/intervention-views"
import type { InterventionView as InterventionEntity } from "@/types/intervention-view"
import { getPropertyLabel } from "@/types/property-schema"
import type { InterventionModalOpenOptions } from "@/hooks/useInterventionModal"

const VIEW_MODES: CalendarLayoutOptions["viewMode"][] = ["month", "week", "day"]

const weekDaysLabels = [0, 1, 2, 3, 4, 5, 6].map((index) =>
  format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), index), "EEE", { locale: fr }),
)

const getDateValue = (intervention: InterventionEntity, property: string | undefined) => {
  if (!property) return null
  const segments = property.split(".")
  let current: unknown = intervention
  for (const segment of segments) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return null
    }
    current = (current as Record<string, unknown>)[segment]
  }
  if (!current) return null
  if (typeof current === "string") {
    const parsed = parseISO(current)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (current instanceof Date) return current
  return null
}

type CalendarViewConfig = InterventionViewDefinition & { layout: "calendar"; layoutOptions: CalendarLayoutOptions }

type CalendarViewProps = {
  view: CalendarViewConfig
  interventions: InterventionEntity[]
  loading: boolean
  error: string | null
  onInterventionClick?: (id: string, options?: InterventionModalOpenOptions) => void
  onLayoutOptionsChange?: (patch: Partial<CalendarLayoutOptions>) => void
}

const formatDayTitle = (date: Date, mode: CalendarLayoutOptions["viewMode"]) => {
  if (mode === "month") return format(date, "MMMM yyyy", { locale: fr })
  if (mode === "week") {
    const start = startOfWeek(date, { weekStartsOn: 1 })
    const end = addDays(start, 6)
    return `${format(start, "d MMM", { locale: fr })} – ${format(end, "d MMM yyyy", { locale: fr })}`
  }
  return format(date, "eeee d MMMM yyyy", { locale: fr })
}

const formatEventTime = (start: Date | null, end: Date | null) => {
  if (!start && !end) return "Toute la journée"
  if (start && end) {
    if (isSameDay(start, end)) {
      return `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`
    }
    return `${format(start, "dd/MM HH:mm")} → ${format(end, "dd/MM HH:mm")}`
  }
  if (start) {
    return `${format(start, "HH:mm")}`
  }
  if (end) {
    return `${format(end, "HH:mm")}`
  }
  return "Toute la journée"
}

export function CalendarView({
  view,
  interventions,
  loading,
  error,
  onInterventionClick,
  onLayoutOptionsChange,
}: CalendarViewProps) {
  const { layoutOptions } = view
  const [referenceDate, setReferenceDate] = useState(() => startOfDay(new Date()))
  const dataset = useMemo(
    () => runQuery(interventions, view.filters, view.sorts),
    [interventions, view.filters, view.sorts],
  )

  const events = useMemo(() => {
    return dataset
      .map((intervention) => {
        const startDate = getDateValue(intervention, layoutOptions.dateProperty)
        const endDate = getDateValue(intervention, layoutOptions.endDateProperty || layoutOptions.dateProperty)
        if (!startDate) return null
        return {
          intervention,
          start: startDate,
          end: endDate ?? startDate,
          key: `${intervention.id}-${startDate.getTime()}`,
        }
      })
      .filter((event): event is {
        intervention: InterventionEntity
        start: Date
        end: Date
        key: string
      } => Boolean(event))
      .sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [dataset, layoutOptions.dateProperty, layoutOptions.endDateProperty])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, typeof events>()
    events.forEach((event) => {
      const dayKey = format(event.start, "yyyy-MM-dd")
      const list = map.get(dayKey)
      if (list) list.push(event)
      else map.set(dayKey, [event])
    })
    return map
  }, [events])

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

  const days = useMemo(() => {
    if (layoutOptions.viewMode === "day") {
      return [referenceDate]
    }

    if (layoutOptions.viewMode === "week") {
      const start = startOfWeek(referenceDate, { weekStartsOn: 1 })
      return Array.from({ length: 7 }, (_, index) => addDays(start, index))
    }

    const start = startOfWeek(startOfMonth(referenceDate), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(referenceDate), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [referenceDate, layoutOptions.viewMode])

  const handleChangeViewMode = (mode: CalendarLayoutOptions["viewMode"]) => {
    if (mode === layoutOptions.viewMode) return
    onLayoutOptionsChange?.({ viewMode: mode })
  }

  const handleNext = () => {
    if (layoutOptions.viewMode === "day") {
      setReferenceDate((prev) => addDays(prev, 1))
    } else if (layoutOptions.viewMode === "week") {
      setReferenceDate((prev) => addWeeks(prev, 1))
    } else {
      setReferenceDate((prev) => addMonths(prev, 1))
    }
  }

  const handlePrevious = () => {
    if (layoutOptions.viewMode === "day") {
      setReferenceDate((prev) => addDays(prev, -1))
    } else if (layoutOptions.viewMode === "week") {
      setReferenceDate((prev) => addWeeks(prev, -1))
    } else {
      setReferenceDate((prev) => addMonths(prev, -1))
    }
  }

  const goToToday = () => {
    setReferenceDate(startOfDay(new Date()))
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-border/60 p-8 text-sm text-muted-foreground">
        Chargement du calendrier…
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-base font-medium text-foreground">{formatDayTitle(referenceDate, layoutOptions.viewMode)}</div>
          <div className="text-xs text-muted-foreground">
            Basé sur la propriété « {layoutOptions.dateProperty} »
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Aujourd’hui
          </Button>
          <div className="flex items-center"> 
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevious}>
              <CornerDownRight className="h-4 w-4 rotate-180" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}>
              <CornerDownRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-border/60 px-1 py-0.5">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                className={cn(
                  "rounded-full px-2 py-1 text-xs capitalize transition",
                  layoutOptions.viewMode === mode ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
                onClick={() => handleChangeViewMode(mode)}
              >
                {mode === "day" ? "Jour" : mode === "week" ? "Semaine" : "Mois"}
              </button>
            ))}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                Champ date
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {view.visibleProperties.map((property) => (
                <DropdownMenuItem key={property} onSelect={() => onLayoutOptionsChange?.({ dateProperty: property })}>
                  {getPropertyLabel(property)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {layoutOptions.viewMode === "day" ? (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">
            {format(referenceDate, "eeee d MMMM yyyy", { locale: fr })}
          </h3>
          <ScrollArea className="h-[520px]">
            <div className="space-y-3">
              {(eventsByDay.get(format(referenceDate, "yyyy-MM-dd")) ?? []).map((event) => (
                <button
                  key={event.key}
                  type="button"
                onClick={() =>
                  onInterventionClick?.(event.intervention.id, {
                    layoutId: `calendar-event-${event.intervention.id}`,
                    orderedIds,
                    index: idToIndex.get(event.intervention.id) ?? 0,
                  })
                }
                  className="w-full rounded-lg border border-border/60 p-3 text-left transition hover:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatEventTime(event.start, event.end)}
                    </span>
                    <Badge variant="outline">{event.intervention.statusValue}</Badge>
                  </div>
                  <div className="mt-1 text-sm font-medium text-foreground">
                    {event.intervention.contexteIntervention || event.intervention.commentaireAgent || "Intervention"}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {event.intervention.nomClient && (
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {event.intervention.prenomClient} {event.intervention.nomClient}
                      </span>
                    )}
                    {event.intervention.adresse && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.intervention.adresse}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {weekDaysLabels.map((label) => (
              <div key={label} className="px-2 py-1 text-center">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd")
              const dayEvents = eventsByDay.get(key) ?? []
              const isToday = isSameDay(day, new Date())
              const isCurrentMonth = isSameMonth(day, referenceDate)
              return (
                <div
                  key={key}
                  className={cn(
                    "flex min-h-[120px] flex-col rounded-lg border border-border/50 bg-card p-2 text-xs transition",
                    isToday && "border-primary/60 shadow-sm",
                    !isCurrentMonth && "bg-muted/40 text-muted-foreground"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("text-sm font-semibold", isToday && "text-primary")}>{format(day, "d")}</span>
                    <span className="text-[10px] text-muted-foreground">{dayEvents.length || ""}</span>
                  </div>
                  <div className="mt-2 flex-1 space-y-2">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.key}
                        type="button"
                      onClick={() =>
                  onInterventionClick?.(event.intervention.id, {
                    layoutId: `calendar-event-${event.intervention.id}`,
                    orderedIds,
                    index: idToIndex.get(event.intervention.id) ?? 0,
                  })
                }
                        className="w-full rounded-md border border-border/50 bg-muted/40 p-1 text-left transition hover:border-primary/50"
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                          <span>{formatEventTime(event.start, event.end)}</span>
                          <Badge variant="outline" className="px-1 text-[10px]">
                            {event.intervention.statusValue}
                          </Badge>
                        </div>
                        <div className="truncate text-[11px] font-medium text-foreground">
                          {event.intervention.contexteIntervention || event.intervention.commentaireAgent || "Intervention"}
                        </div>
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">+ {dayEvents.length - 3} autres</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default CalendarView
