"use client"

import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import Interventions from "@/components/interventions/Interventions"
import { FiltersBar, type DateRange, type SortDir, type SortField } from "@/components/interventions/FiltersBar"
import CalendarView from "@/components/interventions/views/CalendarView"
import GalleryView from "@/components/interventions/views/GalleryView"
import KanbanView from "@/components/interventions/views/KanbanView"
import TableView from "@/components/interventions/views/TableView"
import TimelineView from "@/components/interventions/views/TimelineView"
import { ViewTabs } from "@/components/interventions/views/ViewTabs"
import ColumnConfigurationModal from "@/components/interventions/views/ColumnConfigurationModal"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Check,
  CalendarRange,
  Filter,
  GanttChart,
  Hash,
  KanbanSquare,
  LayoutGrid,
  MoreHorizontal,
  Palette,
  Plus,
  Settings,
  SquareStack,
  Table,
  X,
} from "lucide-react"
import { ModeIcons } from "@/components/ui/mode-selector/ModeIcons"
import { MODE_OPTIONS } from "@/components/ui/mode-selector/ModeSelector"
import { useModalDisplay } from "@/contexts/ModalDisplayContext"
import { useInterventionViews } from "@/hooks/useInterventionViews"
import { useInterventions } from "@/hooks/useInterventions"
import { useInterventionStatusMap } from "@/hooks/useInterventionStatusMap"
import { useAgencyMap } from "@/hooks/useAgencyMap"
import { useMetierMap } from "@/hooks/useMetierMap"
import { useUserMap } from "@/hooks/useUserMap"
import { DEFAULT_WORKFLOW_CONFIG, INTERVENTION_STATUS, SCROLL_CONFIG } from "@/config/interventions"
import { runQuery } from "@/lib/query-engine"
import { validateTransition } from "@/lib/workflow-engine"
import { loadWorkflowConfig, persistWorkflowConfig } from "@/lib/workflow-persistence"
import { WORKFLOW_EVENT_KEY } from "@/hooks/useWorkflowConfig"
import { cn } from "@/lib/utils"
import type { WorkflowConfig } from "@/types/intervention-workflow"
import { mapStatusFromDb, mapStatusToDb } from "@/lib/interventions/mappers"
import type { InterventionCursor } from "@/lib/supabase-api-v2"
import type { InterventionStatusValue } from "@/types/interventions"
import { getDistinctInterventionValues, getInterventionCounts, getInterventionTotalCount } from "@/lib/supabase-api-v2"
import type { InterventionView as InterventionEntity } from "@/types/intervention-view"
import type {
  InterventionViewDefinition,
  LayoutOptions,
  TableLayoutOptions,
  TableRowDensity,
  ViewFilter,
  ViewFilters,
  ViewLayout,
  ViewSort,
} from "@/types/intervention-views"
import useInterventionModal, { InterventionModalOpenOptions } from "@/hooks/useInterventionModal"

type GalleryViewConfig = Parameters<typeof GalleryView>[0]["view"]
type CalendarViewConfig = Parameters<typeof CalendarView>[0]["view"]
type TimelineViewConfig = Parameters<typeof TimelineView>[0]["view"]
type TableViewConfig = Parameters<typeof TableView>[0]["view"]
type KanbanViewConfig = Parameters<typeof KanbanView>[0]["view"]

const WORKFLOW_STORAGE_KEY = "crm:interventions:workflow-config"

const notifyWorkflowUpdate = (workflow: WorkflowConfig) => {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent<WorkflowConfig>(WORKFLOW_EVENT_KEY, { detail: workflow }))
}

const DEFAULT_STATUS_VALUES: InterventionStatusValue[] = [
  "DEMANDE",
  "DEVIS_ENVOYE",
  "VISITE_TECHNIQUE",
  "ACCEPTE",
  "EN_COURS",
  "TERMINE",
  "SAV",
  "STAND_BY",
  "REFUSE",
  "ANNULE",
  "ATT_ACOMPTE",
]

const SORT_FIELD_TO_PROPERTY: Record<SortField, string> = {
  cree: "date",
  echeance: "dateIntervention",
  marge: "marge",
}

const PROPERTY_TO_SORT_FIELD: Record<string, SortField> = Object.entries(SORT_FIELD_TO_PROPERTY).reduce(
  (acc, [field, property]) => {
    acc[property] = field as SortField
    return acc
  },
  {} as Record<string, SortField>,
)

const VIEW_LAYOUT_LABELS: Record<ViewLayout, string> = {
  table: "Tableau",
  cards: "Cartes",
  gallery: "Galerie",
  kanban: "Kanban",
  calendar: "Calendrier",
  timeline: "Chronologie",
}

const VISIBLE_VIEW_LAYOUTS: ViewLayout[] = ["table", "cards", "calendar"]

const VIEW_LAYOUT_ICONS: Record<ViewLayout, ComponentType<{ className?: string }>> = {
  table: Table,
  cards: SquareStack,
  gallery: LayoutGrid,
  kanban: KanbanSquare,
  calendar: CalendarRange,
  timeline: GanttChart,
}

const NEW_VIEW_MENU_CHOICES: Array<{ layout: ViewLayout; label: string; Icon: ComponentType<{ className?: string }> }> = VISIBLE_VIEW_LAYOUTS.map(
  (layout) => ({
  layout,
  label: VIEW_LAYOUT_LABELS[layout],
  Icon: VIEW_LAYOUT_ICONS[layout],
}),
)

const ROW_DENSITY_OPTIONS: Array<{ value: TableRowDensity; label: string }> = [
  { value: "default", label: "Standard" },
  { value: "dense", label: "Dense" },
  { value: "ultra-dense", label: "Ultra-dense" },
]

const managedFilterKeys = {
  status: "statusValue",
  user: "attribueA",
  date: "dateIntervention",
} as const

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const toISODate = (date: Date | null) => (date ? date.toISOString() : undefined)

const filtersShallowEqual = (a: ViewFilter[], b: ViewFilter[]) => {
  if (a === b) return true
  if (a.length !== b.length) return false
  return a.every((filter) =>
    b.some(
      (candidate) =>
        candidate.property === filter.property &&
        candidate.operator === filter.operator &&
        JSON.stringify(candidate.value ?? null) === JSON.stringify(filter.value ?? null),
    ),
  )
}

type ServerFilterParams = {
  statut?: string | string[]
  agence?: string | string[]
  artisan?: string | string[]
  metier?: string | string[]
  user?: string | string[]
  startDate?: string
  endDate?: string
}

/**
 * Colonnes de tri supportées côté serveur
 * ⚠️ Les alias (dateIntervention, date_intervention) seront mappés vers 'date' par l'API V2
 */
const SUPPORTED_SERVER_SORTS = new Set<string>([
  "created_at",
  "date",
  "dateIntervention",  // → mappé vers 'date'
  "date_intervention", // → mappé vers 'date'
  "datePrevue",
  "date_prevue",
  "dueDate",
  "due_date",
  "dateTermine",
  "date_termine",
])

const normalizeDateValue = (value: unknown): string | undefined => {
  if (!value) return undefined
  if (value instanceof Date) {
    const iso = value.toISOString()
    return Number.isNaN(value.getTime()) ? undefined : iso
  }
  const raw = String(value)
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    return raw
  }
  return parsed.toISOString()
}

const deriveServerQueryConfig = (
  view: InterventionViewDefinition,
  statusCodeToId: (code: string | string[] | undefined) => string | string[] | undefined,
  userNameToId: (name: string | string[] | undefined) => string | string[] | undefined,
  agencyNameToId: (name: string | string[] | undefined) => string | string[] | undefined,
  metierNameToId: (name: string | string[] | undefined) => string | string[] | undefined,
): {
  serverFilters: ServerFilterParams
  residualFilters: ViewFilters
  serverSort?: ViewSort
  residualSorts: ViewSort[]
} => {
  const serverFilters: ServerFilterParams = {}
  const residualFilters: ViewFilters = []

  for (const filter of view.filters) {
    const { property, operator, value } = filter
    let handled = false

    switch (property) {
      case "statusValue":
      case "statut":
      case "statut_id": {
        // ⚠️ Convertir CODE → UUID avant d'envoyer au serveur
        if (operator === "eq" && typeof value === "string") {
          const statusId = statusCodeToId(value)
          if (statusId && typeof statusId === "string") {
            serverFilters.statut = statusId
            handled = true
          }
        } else if (operator === "in" && Array.isArray(value) && value.length > 0) {
          const statusIds = statusCodeToId(value.map((item) => String(item)))
          if (Array.isArray(statusIds) && statusIds.length > 0) {
            serverFilters.statut = statusIds
            handled = true
          }
        }
        break
      }
      case "attribueA":
      case "assigned_user_id": {
        // ⚠️ Convertir USERNAME → UUID si ce n'est pas déjà un UUID
        if (operator === "eq" && typeof value === "string") {
          // Si c'est déjà un UUID, le garder tel quel
          const isUuid = UUID_REGEX.test(value)
          const userId = isUuid ? value : userNameToId(value)
          if (userId && typeof userId === "string") {
            serverFilters.user = userId
            handled = true
          }
        } else if (operator === "in" && Array.isArray(value) && value.length > 0) {
          const userIds = value.map((v) => {
            const str = String(v)
            const isUuid = UUID_REGEX.test(str)
            return isUuid ? str : userNameToId(str)
          }).filter(Boolean) as string[]
          if (userIds.length > 0) {
            serverFilters.user = userIds
            handled = true
          }
        } else if (operator === "is_empty") {
          // Filtre les interventions sans assignation (vue Market)
          serverFilters.user = null as any
          handled = true
        }
        break
      }
      case "agence":
      case "agence_id": {
        if (operator === "eq" && typeof value === "string") {
          const trimmed = value.trim()
          const isUuid = UUID_REGEX.test(trimmed)
          const agencyId = isUuid ? trimmed : agencyNameToId(trimmed)
          if (agencyId && typeof agencyId === "string") {
            serverFilters.agence = agencyId
            handled = true
          }
        } else if (operator === "in" && Array.isArray(value) && value.length > 0) {
          const ids = value
            .map((item) => {
              const raw = String(item).trim()
              if (!raw) return undefined
              if (UUID_REGEX.test(raw)) return raw
              return agencyNameToId(raw)
            })
            .filter((item): item is string => Boolean(item))
          if (ids.length > 0) {
            serverFilters.agence = ids
            handled = true
          }
        }
        break
      }
      case "metier":
      case "metier_id": {
        if (operator === "eq" && typeof value === "string") {
          const trimmed = value.trim()
          const isUuid = UUID_REGEX.test(trimmed)
          const metierId = isUuid ? trimmed : metierNameToId(trimmed)
          if (metierId && typeof metierId === "string") {
            serverFilters.metier = metierId
            handled = true
          }
        } else if (operator === "in" && Array.isArray(value) && value.length > 0) {
          const ids = value
            .map((item) => {
              const raw = String(item).trim()
              if (!raw) return undefined
              if (UUID_REGEX.test(raw)) return raw
              return metierNameToId(raw)
            })
            .filter((item): item is string => Boolean(item))
          if (ids.length > 0) {
            serverFilters.metier = ids
            handled = true
          }
        }
        break
      }
      case "dateIntervention":
      case "date_intervention": {
        if (operator === "between") {
          let from: string | undefined
          let to: string | undefined
          if (Array.isArray(value)) {
            from = normalizeDateValue(value[0])
            to = normalizeDateValue(value[1])
          } else if (value && typeof value === "object") {
            const lookup = value as { from?: unknown; to?: unknown }
            from = normalizeDateValue(lookup.from)
            to = normalizeDateValue(lookup.to)
          }
          if (from) serverFilters.startDate = from
          if (to) serverFilters.endDate = to
          handled = Boolean(from || to)
        } else if (operator === "gte" || operator === "gt") {
          const from = normalizeDateValue(value)
          if (from) {
            serverFilters.startDate = from
            handled = true
          }
        } else if (operator === "lte" || operator === "lt") {
          const to = normalizeDateValue(value)
          if (to) {
            serverFilters.endDate = to
            handled = true
          }
        } else if (operator === "eq") {
          const point = normalizeDateValue(value)
          if (point) {
            serverFilters.startDate = point
            serverFilters.endDate = point
            handled = true
          }
        }
        break
      }
      default:
        break
    }

    if (!handled) {
      residualFilters.push(filter)
    }
  }

  let serverSort: ViewSort | undefined
  const residualSorts: ViewSort[] = []
  for (const sort of view.sorts) {
    if (!serverSort && SUPPORTED_SERVER_SORTS.has(sort.property)) {
      serverSort = sort
    } else {
      residualSorts.push(sort)
    }
  }

  return { serverFilters, residualFilters, serverSort, residualSorts }
}

export default function Page() {
  const router = useRouter()
  const { preferredMode, setPreferredMode } = useModalDisplay()
  const {
    views,
    activeView,
    activeViewId,
    setActiveView,
    createView,
    duplicateView,
    updateView: updateViewConfig,
    updateLayoutOptions,
    updateFilters,
    updateSorts,
    reorderViews,
    removeView,
    resetViewToDefault,
    isReady,
    registerExternalView,
  } = useInterventionViews()

  const [statusError, setStatusError] = useState<string | null>(null)
  const [columnConfigViewId, setColumnConfigViewId] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null })
  const [sortField, setSortField] = useState<SortField>("cree")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [selectedStatus, setSelectedStatus] = useState<InterventionStatusValue | null>(null)
  const [isReorderMode, setIsReorderMode] = useState(false)
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig>(DEFAULT_WORKFLOW_CONFIG)
  const [serverFilters, setServerFilters] = useState<ServerFilterParams>({})
  const [residualFilters, setResidualFilters] = useState<ViewFilters>([])
  const [residualSorts, setResidualSorts] = useState<ViewSort[]>([])
  const [serverSort, setServerSort] = useState<ViewSort | undefined>(undefined)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({})
  
  // Hooks pour mapper CODE/USERNAME → UUID
  const { statusMap, loading: statusMapLoading } = useInterventionStatusMap()
  const { userMap, loading: userMapLoading } = useUserMap()
  const { agencyMap, loading: agencyMapLoading } = useAgencyMap()
  const { metierMap, loading: metierMapLoading } = useMetierMap()
  
  const statusCodeToId = useCallback(
    (code: string | string[] | undefined): string | string[] | undefined => {
      if (!code) return undefined
      if (Array.isArray(code)) {
        const ids = code
          .map((value) => {
            const key = String(value)
            const upperKey = key.toUpperCase()
            // Chercher d'abord avec le code tel quel, puis en majuscules
            const normalizedKey = key
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-zA-Z0-9]+/g, "_")
              .toUpperCase()
            return (
              statusMap[key] ?? statusMap[upperKey] ?? statusMap[normalizedKey]
            )
          })
          .filter((value): value is string => Boolean(value))
        return ids.length ? ids : undefined
      }
      const key = String(code)
      const upperKey = key.toUpperCase()
      const normalizedKey = key
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .toUpperCase()
      // Chercher d'abord avec le code tel quel, puis en majuscules
      return statusMap[key] ?? statusMap[upperKey] ?? statusMap[normalizedKey]
    },
    [statusMap],
  )

  const userNameToId = useCallback(
    (name: string | string[] | undefined): string | string[] | undefined => {
      if (!name) return undefined
      if (Array.isArray(name)) {
        const ids = name
          .map((value) => {
            const normalized = String(value).toLowerCase()
            return userMap[normalized]
          })
          .filter((value): value is string => Boolean(value))
        return ids.length ? ids : undefined
      }
      const normalized = String(name).toLowerCase()
      return userMap[normalized]
    },
    [userMap],
  )

  const agencyNameToId = useCallback(
    (name: string | string[] | undefined): string | string[] | undefined => {
      if (!name) return undefined

      const resolve = (input: string): string | undefined => {
        const trimmed = input.trim()
        if (!trimmed) return undefined
        if (UUID_REGEX.test(trimmed)) return trimmed
        const lower = trimmed.toLowerCase()
        return agencyMap.byLabel[lower] ?? agencyMap.byCode[lower]
      }

      if (Array.isArray(name)) {
        const ids = name
          .map((value) => resolve(String(value)))
          .filter((value): value is string => Boolean(value))
        return ids.length ? ids : undefined
      }

      return resolve(String(name))
    },
    [agencyMap],
  )

  const metierNameToId = useCallback(
    (name: string | string[] | undefined): string | string[] | undefined => {
      if (!name) return undefined

      const resolve = (input: string): string | undefined => {
        const trimmed = input.trim()
        if (!trimmed) return undefined
        if (UUID_REGEX.test(trimmed)) return trimmed
        const lower = trimmed.toLowerCase()
        return metierMap.byLabel[lower] ?? metierMap.byCode[lower]
      }

      if (Array.isArray(name)) {
        const ids = name
          .map((value) => resolve(String(value)))
          .filter((value): value is string => Boolean(value))
        return ids.length ? ids : undefined
      }

      return resolve(String(name))
    },
    [metierMap],
  )

  const mapsLoading = statusMapLoading || userMapLoading || agencyMapLoading || metierMapLoading
  const showStatusFilter = useMemo(() => {
    if (activeView?.layout !== "table") return false
    const tableOptions = activeView.layoutOptions as TableLayoutOptions
    return tableOptions.showStatusFilter ?? false
  }, [activeView])
  const { open: openInterventionModal } = useInterventionModal()

  const viewFields = useMemo(() => {
    if (!activeView?.visibleProperties) {
      return undefined
    }
    const normalized = activeView.visibleProperties
      .map((field) => (field ? field.trim() : ""))
      .filter((field): field is string => Boolean(field))
    if (!normalized.length) {
      return undefined
    }
    return Array.from(new Set(normalized))
  }, [activeView?.visibleProperties])

  const {
    interventions: fetchedInterventions,
    setInterventions: updateRemoteInterventions,
    loading: remoteLoading,
    error: remoteError,
    hasMore,
    totalCount,
    loadMore,
    refresh,
    updateInterventionOptimistic,
    setQuery: setRemoteQuery,
    setSearch: setRemoteSearch,
    direction: remoteDirection,
    currentCursor,
  } = useInterventions({
    autoLoad: true,
    limit: SCROLL_CONFIG.BATCH_SIZE,
    maxCachedItems: SCROLL_CONFIG.MAX_CACHED_ITEMS,
    slidingWindow: SCROLL_CONFIG.SLIDING_WINDOW_ENABLED,
    viewId: activeViewId,  // ✅ Force reload au changement de vue
    fields: viewFields,
  })

  const cursorRegistryRef = useRef<Map<string, InterventionCursor | null>>(new Map())
  const previousScopeKeyRef = useRef<string | null>(null)
  const fetchStartRef = useRef<number | null>(null)
  const previousLoadingRef = useRef<boolean>(false)

  const cursorScopeKey = useMemo(() => {
    const keyPayload = {
      view: activeViewId ?? "default",
      filters: serverFilters,
      sort: serverSort ?? null,
      search: search?.trim() || null,
    }
    return JSON.stringify(keyPayload)
  }, [activeViewId, serverFilters, serverSort, search])

  useEffect(() => {
    if (previousScopeKeyRef.current && previousScopeKeyRef.current !== cursorScopeKey) {
      cursorRegistryRef.current.clear()
    }
    previousScopeKeyRef.current = cursorScopeKey
  }, [cursorScopeKey])

  useEffect(() => {
    cursorRegistryRef.current.set(cursorScopeKey, currentCursor ?? null)
  }, [cursorScopeKey, currentCursor])

  useEffect(() => {
    if (remoteLoading) {
      fetchStartRef.current = typeof performance !== "undefined" ? performance.now() : Date.now()
    } else if (previousLoadingRef.current && !remoteLoading) {
      const endTime = typeof performance !== "undefined" ? performance.now() : Date.now()
      const duration = fetchStartRef.current ? endTime - fetchStartRef.current : null
      console.debug("[interventions] load", {
        direction: remoteDirection,
        cursor: currentCursor,
        count: fetchedInterventions.length,
        total: totalCount,
        duration: duration !== null ? Math.round(duration) : null,
        scope: cursorScopeKey,
        historySize: cursorRegistryRef.current.size,
      })
      fetchStartRef.current = null
    }
    previousLoadingRef.current = remoteLoading
  }, [remoteLoading, currentCursor, remoteDirection, fetchedInterventions.length, totalCount, cursorScopeKey])

  const normalizedInterventions = useMemo(
    () => fetchedInterventions.map((item) => {
      const statusCode = item.status?.code ?? item.statusValue ?? (item as any).statut
      const normalizedStatus = mapStatusFromDb(statusCode)
      return {
        ...item,
        statusValue: normalizedStatus,
        statusLabel: item.status?.label ?? (item as any).statusLabel ?? null,
        statusColor: item.status?.color ?? (item as any).statusColor ?? null,
        assignedUserColor: (item as any).assignedUserColor ?? null,
      } as InterventionEntity
    }),
    [fetchedInterventions],
  )
  const loading = remoteLoading && normalizedInterventions.length === 0
  const error = remoteError ?? statusError

  const loadingProgress = useMemo(() => {
    const loadedCount = normalizedInterventions.length
    const total = totalCount ?? loadedCount
    const progressValue = total > 0 ? Math.min(100, (loadedCount / total) * 100) : hasMore ? 0 : 100
    return {
      loaded: loadedCount,
      total,
      isComplete: !hasMore,
      progress: progressValue,
    }
  }, [normalizedInterventions, totalCount, hasMore])

  const serverAppliedInterventions = useMemo(() => {
    const datasetSize = totalCount ?? normalizedInterventions.length
    const hasResidual = residualFilters.length > 0 || residualSorts.length > 0
    const isLargeDataset = datasetSize > SCROLL_CONFIG.LARGE_DATASET_THRESHOLD

    if (isLargeDataset && hasResidual) {
      console.warn(
        "⚠️ Large dataset detected. Client-side filters/sorts disabled. All filtering must be done server-side.",
      )
      return normalizedInterventions
    }

    if (!hasResidual) {
      return normalizedInterventions
    }

    return runQuery(normalizedInterventions, residualFilters, residualSorts)
  }, [normalizedInterventions, residualFilters, residualSorts, totalCount])

  const searchedInterventions = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return serverAppliedInterventions
    return serverAppliedInterventions.filter((intervention) => {
      const haystack = [
        intervention.contexteIntervention,
        intervention.nomClient,
        intervention.prenomClient,
        intervention.commentaireAgent,
      ]
        .map((value) => (value || "").toLowerCase())
        .join(" ")
      return haystack.includes(term)
    })
  }, [search, serverAppliedInterventions])

  const loadDistinctValues = useCallback(
    async (property: string) => {
      try {
        const values = await getDistinctInterventionValues(property, serverFilters)
        return values
      } catch (error) {
        console.error("Failed to fetch distinct values", error)
        return []
      }
    },
    [serverFilters],
  )

  // Charger les comptages par statut au démarrage et lors des changements
  useEffect(() => {
    if (mapsLoading) return
    
    getInterventionCounts(serverFilters)
      .then((counts) => setStatusCounts(counts))
      .catch((err) => console.error("Failed to load status counts", err))
  }, [serverFilters, mapsLoading])

  useEffect(() => {
    if (!isReady || mapsLoading) return

    const viewsWithBadges = views.filter((view) => view.showBadge)
    if (!viewsWithBadges.length) {
      setViewCounts({})
      return
    }

    let cancelled = false

    const fetchCounts = async () => {
      const entries: Array<[string, number]> = []
      for (const view of viewsWithBadges) {
        const { serverFilters: viewServerFilters } = deriveServerQueryConfig(
          view,
          statusCodeToId,
          userNameToId,
          agencyNameToId,
        )
        try {
          const hasFilters = Object.keys(viewServerFilters).length > 0
          const total = await getInterventionTotalCount(hasFilters ? viewServerFilters : undefined)
          entries.push([view.id, total])
        } catch (error) {
          console.error(`Failed to fetch total count for view ${view.id}`, error)
          const fallback = localViewCountsRef.current[view.id] ?? 0
          entries.push([view.id, fallback])
        }
      }

      if (!cancelled) {
        setViewCounts((prev) => {
          const next = { ...prev }
          entries.forEach(([id, count]) => {
            next[id] = count
          })
          return next
        })
      }
    }

    fetchCounts()

    return () => {
      cancelled = true
    }
  }, [views, isReady, mapsLoading, statusCodeToId, userNameToId, agencyNameToId, metierNameToId])

  useEffect(() => {
    if (!isReady || !activeView || mapsLoading) return
    const { serverFilters: nextServerFilters, residualFilters: nextResidualFilters, serverSort: nextServerSort, residualSorts: nextResidualSorts } =
      deriveServerQueryConfig(activeView, statusCodeToId, userNameToId, agencyNameToId, metierNameToId)

    if (
      nextResidualFilters.length > 2 &&
      (totalCount ?? 0) > SCROLL_CONFIG.CLIENT_FILTER_WARNING_THRESHOLD
    ) {
      console.warn(
        `⚠️ Performance warning: ${nextResidualFilters.length} filtres appliqués côté client sur ${
          totalCount ?? 0
        } lignes. Cela peut causer des ralentissements. Filtres résiduels:`,
        nextResidualFilters.map((filter) => filter.property),
      )
    }

    if (JSON.stringify(nextServerFilters) !== JSON.stringify(serverFilters)) {
      setServerFilters(nextServerFilters)
    }
    if (JSON.stringify(nextResidualFilters) !== JSON.stringify(residualFilters)) {
      setResidualFilters(nextResidualFilters)
    }
    if (JSON.stringify(nextResidualSorts) !== JSON.stringify(residualSorts)) {
      setResidualSorts(nextResidualSorts)
    }
    const sortChanged =
      (!serverSort && nextServerSort) ||
      (serverSort && !nextServerSort) ||
      (serverSort &&
        nextServerSort &&
        (serverSort.property !== nextServerSort.property || serverSort.direction !== nextServerSort.direction))

    if (sortChanged) {
      setServerSort(nextServerSort)
    }

    const nextQueryKey = JSON.stringify({
      filters: nextServerFilters,
      sort: nextServerSort ?? null,
    })
    const previousQueryKey = JSON.stringify({
      filters: serverFilters,
      sort: serverSort ?? null,
    })

    if (nextQueryKey !== previousQueryKey) {
      setRemoteQuery({
        filters: nextServerFilters,
        sortBy: nextServerSort?.property,
        sortDir: nextServerSort?.direction,
      })
    }
  }, [
    activeView,
    isReady,
    mapsLoading,
    residualFilters,
    residualSorts,
    serverFilters,
    serverSort,
    setRemoteQuery,
    statusCodeToId,
    userNameToId,
    agencyNameToId,
    metierNameToId,
    totalCount,
  ])

  useEffect(() => {
    const trimmed = search.trim()
    const handle = setTimeout(() => {
      setRemoteSearch(trimmed || undefined)
    }, 300)
    return () => clearTimeout(handle)
  }, [search, setRemoteSearch])

  // Écouter les mises à jour d'interventions depuis le modal
  useEffect(() => {
    const handleInterventionUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ id: string; data: any; optimistic?: boolean }>
      const { id, data, optimistic } = customEvent.detail || {}
      
      if (optimistic && id && data) {
        // Mise à jour optimiste immédiate (sans rechargement)
        console.log('⚡ Mise à jour optimiste détectée pour', id)
        updateInterventionOptimistic(id, data)
        
        // Rafraîchir quand même en arrière-plan après un court délai
        setTimeout(() => {
          console.log('🔄 Rafraîchissement en arrière-plan après mise à jour optimiste')
          refresh()
        }, 500)
      } else {
        // Mise à jour normale : rafraîchir immédiatement
        console.log('🔄 Rafraîchissement complet suite à mise à jour')
        refresh()
      }
    }

    window.addEventListener("intervention-updated", handleInterventionUpdate)
    return () => {
      window.removeEventListener("intervention-updated", handleInterventionUpdate)
    }
  }, [refresh, updateInterventionOptimistic])

  useEffect(() => {
    if (typeof window === "undefined") return
    const persisted = loadWorkflowConfig(WORKFLOW_STORAGE_KEY)
    if (persisted) {
      setWorkflowConfig(persisted)
    }

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<WorkflowConfig>).detail
      if (detail) {
        setWorkflowConfig(detail)
      }
    }

    window.addEventListener(WORKFLOW_EVENT_KEY, handler as EventListener)
    return () => {
      window.removeEventListener(WORKFLOW_EVENT_KEY, handler as EventListener)
    }
  }, [])

  const workflowPinnedStatuses = useMemo(
    () =>
      workflowConfig.statuses
        .filter((status) => status.isPinned)
        .sort((a, b) => (a.pinnedOrder ?? 0) - (b.pinnedOrder ?? 0))
        .map((status) => status.key as InterventionStatusValue),
    [workflowConfig.statuses],
  )

  const updatePinnedStatus = useCallback(
    (status: InterventionStatusValue, shouldPin: boolean) => {
      setWorkflowConfig((prev) => {
        const clone: WorkflowConfig = JSON.parse(JSON.stringify(prev))
        const target = clone.statuses.find((item) => item.key === status)
        if (!target) return prev
        if (shouldPin) {
          if (target.isPinned) return prev
          target.isPinned = true
          target.pinnedOrder =
            clone.statuses.reduce(
              (max, item) => (item.isPinned && item.pinnedOrder != null ? Math.max(max, item.pinnedOrder) : max),
              -1,
            ) + 1
        } else {
          if (!target.isPinned) return prev
          target.isPinned = false
          target.pinnedOrder = undefined
        }

        const pinned = clone.statuses
          .filter((item) => item.isPinned)
          .sort((a, b) => (a.pinnedOrder ?? 0) - (b.pinnedOrder ?? 0))

        pinned.forEach((item, index) => {
          item.pinnedOrder = index
        })

        clone.updatedAt = new Date().toISOString()
        persistWorkflowConfig(WORKFLOW_STORAGE_KEY, clone)
        notifyWorkflowUpdate(clone)
        return clone
      })
    },
    [],
  )

  useEffect(() => {
    if (!activeView) return
    const primarySort = activeView.sorts[0]
    if (primarySort) {
      const mappedField = PROPERTY_TO_SORT_FIELD[primarySort.property]
      if (mappedField && mappedField !== sortField) {
        setSortField(mappedField)
      }
      const direction = primarySort.direction === "asc" ? "asc" : "desc"
      if (direction !== sortDir) {
        setSortDir(direction)
      }
    }
  }, [activeView, sortDir, sortField])

  useEffect(() => {
    if (!isReady || !activeView) return
    const property = SORT_FIELD_TO_PROPERTY[sortField]
    if (!property) return
    const currentSort = activeView.sorts[0]
    if (currentSort && currentSort.property === property && currentSort.direction === sortDir) return
    updateSorts(activeView.id, [{ property, direction: sortDir }])
  }, [sortField, sortDir, activeView, isReady, updateSorts])

  const updateFilterForProperty = useCallback(
    (property: string, nextFilter: ViewFilter | null) => {
      if (!activeView) return
      const without = activeView.filters.filter((filter) => filter.property !== property)
      const candidate = nextFilter ? [...without, nextFilter] : without
      if (filtersShallowEqual(activeView.filters, candidate)) return
      updateFilters(activeView.id, candidate)
    },
    [activeView, updateFilters],
  )

  useEffect(() => {
    if (!activeView) return
    const statusFilter = activeView.filters.find((filter) => filter.property === managedFilterKeys.status)
    const statusValue =
      statusFilter && typeof statusFilter.value === "string"
        ? (statusFilter.value as InterventionStatusValue)
        : null
    setSelectedStatus((prev) => (prev === statusValue ? prev : statusValue))

    const userFilter = activeView.filters.find((filter) => filter.property === managedFilterKeys.user)
    const userValue = userFilter && typeof userFilter.value === "string" ? (userFilter.value as string) : ""
    setSelectedUser((prev) => (prev === userValue ? prev : userValue))

    const dateFilter = activeView.filters.find(
      (filter) => filter.property === managedFilterKeys.date && filter.operator === "between",
    )

    let nextFrom: Date | null = null
    let nextTo: Date | null = null
    if (dateFilter) {
      if (Array.isArray(dateFilter.value)) {
        nextFrom = dateFilter.value[0] ? new Date(dateFilter.value[0] as string) : null
        nextTo = dateFilter.value[1] ? new Date(dateFilter.value[1] as string) : null
      } else if (dateFilter.value && typeof dateFilter.value === "object") {
        const lookup = dateFilter.value as { from?: string; to?: string }
        nextFrom = lookup.from ? new Date(lookup.from) : null
        nextTo = lookup.to ? new Date(lookup.to) : null
      }
      if (nextFrom && Number.isNaN(nextFrom.getTime())) nextFrom = null
      if (nextTo && Number.isNaN(nextTo.getTime())) nextTo = null
    }

    setDateRange((prev) => {
      const sameFrom =
        (prev.from == null && nextFrom == null) ||
        (!!prev.from && !!nextFrom && prev.from.getTime() === nextFrom.getTime())
      const sameTo =
        (prev.to == null && nextTo == null) ||
        (!!prev.to && !!nextTo && prev.to.getTime() === nextTo.getTime())
      if (sameFrom && sameTo) return prev
      return { from: nextFrom, to: nextTo }
    })
  }, [activeView])

  const usersForFilter = useMemo(() => {
    const s = new Set<string>()
    serverAppliedInterventions.forEach((i) => i.attribueA && s.add(i.attribueA))
    return Array.from(s)
  }, [serverAppliedInterventions])

  const viewInterventions = searchedInterventions

  const localViewCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    views.forEach((view) => {
      const filtered = runQuery(normalizedInterventions, view.filters, view.sorts)
      counts[view.id] = filtered.length
    })
    return counts
  }, [normalizedInterventions, views])

  const localViewCountsRef = useRef(localViewCounts)

  useEffect(() => {
    localViewCountsRef.current = localViewCounts
  }, [localViewCounts])

  const uniqueStatuses = useMemo(() => {
    const set = new Set<InterventionStatusValue>()
    serverAppliedInterventions.forEach((intervention) => set.add(intervention.statusValue))
    return Array.from(set)
  }, [serverAppliedInterventions])

  const displayedStatuses = useMemo(() => {
    const order = [...DEFAULT_STATUS_VALUES]
    const seen = new Set<InterventionStatusValue>(order)

    workflowPinnedStatuses.forEach((status) => {
      if (!seen.has(status)) {
        order.push(status)
        seen.add(status)
      }
    })

    uniqueStatuses.forEach((status) => {
      if (!seen.has(status)) {
        order.push(status)
        seen.add(status)
      }
    })

    if (selectedStatus && !seen.has(selectedStatus)) {
      order.push(selectedStatus)
    }

    return order
  }, [workflowPinnedStatuses, uniqueStatuses, selectedStatus])

  const additionalStatuses = useMemo(
    () =>
      uniqueStatuses.filter(
        (status) => !workflowPinnedStatuses.includes(status) && !DEFAULT_STATUS_VALUES.includes(status),
      ),
    [uniqueStatuses, workflowPinnedStatuses],
  )

  const combinedViewCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    views.forEach((view) => {
      const remote = viewCounts[view.id]
      const fallback = localViewCounts[view.id]
      counts[view.id] = remote ?? fallback ?? 0
    })
    return counts
  }, [views, viewCounts, localViewCounts])

  // Comptage par statut - utilise les comptages serveur (temps réel)
  const getCountByStatus = useCallback(
    (status: InterventionStatusValue | null) => {
      if (!status) {
        // Compter toutes les interventions
        return Object.values(statusCounts).reduce((sum, count) => sum + count, 0)
      }
      // Convertir CODE → UUID puis récupérer le comptage
      const statusId = statusCodeToId(status)
      if (!statusId || typeof statusId !== "string") return 0
      return statusCounts[statusId] || 0
    },
    [statusCounts, statusCodeToId],
  )

  const handlePinStatus = useCallback(
    (status: InterventionStatusValue) => {
      updatePinnedStatus(status, true)
    },
    [updatePinnedStatus],
  )

  const handleUnpinStatus = useCallback(
    (status: InterventionStatusValue) => {
      updatePinnedStatus(status, false)
    },
    [updatePinnedStatus],
  )

  const handleSelectStatus = useCallback(
    (status: InterventionStatusValue | null) => {
      setSelectedStatus(status)
      updateFilterForProperty(
        managedFilterKeys.status,
        status
          ? { property: managedFilterKeys.status, operator: "eq", value: status }
          : null,
      )
    },
    [updateFilterForProperty],
  )

  const handleSelectUser = useCallback(
    (user: string) => {
      setSelectedUser(user)
      updateFilterForProperty(
        managedFilterKeys.user,
        user
          ? { property: managedFilterKeys.user, operator: "eq", value: user }
          : null,
      )
    },
    [updateFilterForProperty],
  )

  const handleDateRangeChange = useCallback(
    (range: DateRange) => {
      setDateRange(range)
      const hasBounds = Boolean(range.from || range.to)
      updateFilterForProperty(
        managedFilterKeys.date,
        hasBounds
          ? {
              property: managedFilterKeys.date,
              operator: "between",
              value: {
                from: toISODate(range.from),
                to: toISODate(range.to),
              },
            }
          : null,
      )
    },
    [updateFilterForProperty],
  )

  const handleStatusChange = useCallback(
    async (id: string, status: InterventionStatusValue) => {
      const currentIntervention = normalizedInterventions.find((intervention) => intervention.id === id)
      if (!currentIntervention) return

      const previous = currentIntervention.statusValue
      const statusLabel = mapStatusToDb(status)

      const nextDevisId = currentIntervention.devisId ?? null

      const interventionBusinessId =
        (currentIntervention as any).id_inter ??
        (currentIntervention as any).idInter ??
        (currentIntervention as any).idIntervention ??
        null

      const validation = validateTransition(
        workflowConfig,
        previous,
        status,
        {
          id: currentIntervention.id,
          artisanId:
            (currentIntervention as any).artisan ?? (currentIntervention as any).artisanId ?? null,
          factureId: currentIntervention.idFacture ? String(currentIntervention.idFacture) : null,
          proprietaireId:
            (currentIntervention as any).proprietaireId ??
            ((currentIntervention as any).nomProprietaire || (currentIntervention as any).prenomProprietaire
              ? `${(currentIntervention as any).prenomProprietaire ?? ""} ${(currentIntervention as any).nomProprietaire ?? ""}`
                  .trim() || null
              : null),
          commentaire:
            (currentIntervention as any).commentaireAgent ?? (currentIntervention as any).commentaire ?? null,
          devisId: nextDevisId ?? currentIntervention.devisId ?? null,
          idIntervention: interventionBusinessId,
        },
      )

      if (!validation.canTransition) {
        const messages = [...validation.missingRequirements, ...validation.failedConditions]
        setStatusError(messages.join(" · ") || "Transition non autorisée")
        return
      }

      setStatusError(null)

      updateRemoteInterventions((prev) =>
        prev.map((intervention) =>
          intervention.id === id
            ? {
                ...intervention,
                statusValue: status,
                statut: statusLabel,
                devisId: nextDevisId ?? intervention.devisId ?? null,
              }
            : intervention,
        ),
      )

      try {
        const response = await fetch(`/api/interventions/${id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: statusLabel }),
        })

        if (!response.ok) {
          throw new Error(await response.text())
        }
      } catch (err) {
        updateRemoteInterventions((prev) =>
          prev.map((intervention) =>
            intervention.id === id
              ? {
                  ...intervention,
                  statusValue: previous,
                  statut: mapStatusToDb(previous),
                  devisId: currentIntervention.devisId ?? null,
                }
              : intervention,
          ),
        )
        setStatusError((err as Error).message)
      }
    },
    [normalizedInterventions, workflowConfig, updateRemoteInterventions],
  )

  const handleNavigateToDetail = useCallback(
    (id: string, options?: InterventionModalOpenOptions) => {
      openInterventionModal(id, {
        ...options,
        origin: options?.origin ?? activeViewId ?? undefined,
      })
    },
    [activeViewId, openInterventionModal],
  )

  const handleCreateView = useCallback(
    (layout: ViewLayout) => {
      if (!VISIBLE_VIEW_LAYOUTS.includes(layout)) return
      const label = VIEW_LAYOUT_LABELS[layout]
      const fallbackTitle = `${label} personnalisée`
      const title = window.prompt("Nom de la nouvelle vue", fallbackTitle)
      if (!title) return
      createView({
        title,
        layout,
        visibleProperties: activeView?.visibleProperties ?? [],
        filters: activeView?.filters ?? [],
        sorts: activeView?.sorts ?? [],
        layoutOptions: activeView?.layoutOptions,
      })
    },
    [activeView, createView],
  )

  const handleRenameView = useCallback(
    (id: string) => {
      const view = views.find((item) => item.id === id)
      if (!view) return
      const nextTitle = window.prompt("Renommer la vue", view.title)
      if (!nextTitle || nextTitle.trim() === view.title) return
      updateViewConfig(id, { title: nextTitle.trim() })
    },
    [updateViewConfig, views],
  )

  const handleDuplicateView = useCallback(
    (id: string) => {
      const view = views.find((item) => item.id === id)
      if (!view) return
      const title = window.prompt("Nom de la copie", `${view.title} (copie)`)
      if (!title) return
      duplicateView(id, title)
    },
    [duplicateView, views],
  )

  const handleDeleteView = useCallback(
    (id: string) => {
      const view = views.find((item) => item.id === id)
      if (!view) return
      if (view.isDefault) return
      const confirmed = window.confirm(`Supprimer la vue « ${view.title} » ?`)
      if (!confirmed) return
      removeView(id)
    },
    [removeView, views],
  )

  const handleLayoutOptionsPatch = useCallback(
    (options: Partial<LayoutOptions>) => {
      if (!activeView) return
      updateLayoutOptions(activeView.id, options)
    },
    [activeView, updateLayoutOptions],
  )

  const currentModeOption = useMemo(
    () => MODE_OPTIONS.find((option) => option.mode === preferredMode) ?? MODE_OPTIONS[0],
    [preferredMode],
  )
  const CurrentModeIcon = ModeIcons[currentModeOption.mode]
  const activeTableLayoutOptions =
    activeView?.layout === "table" ? (activeView.layoutOptions as TableLayoutOptions) : undefined
  const activeRowDensity: TableRowDensity =
    (activeTableLayoutOptions?.rowDensity ??
      (activeTableLayoutOptions?.dense ? "dense" : "default")) as TableRowDensity

  const renderActiveView = () => {
    if (!activeView) return null
    if (!VISIBLE_VIEW_LAYOUTS.includes(activeView.layout)) return null

    switch (activeView.layout) {
      case "table":
        return (
          <TableView
            view={activeView as TableViewConfig}
            interventions={viewInterventions}
            allInterventions={serverAppliedInterventions}
            loading={loading}
            error={error}
            hasMore={hasMore}
            onEndReached={loadMore}
            onStartReached={() => loadMore("backward")}
            loadDistinctValues={loadDistinctValues}
            onInterventionClick={handleNavigateToDetail}
            onLayoutOptionsChange={(options) => handleLayoutOptionsPatch(options)}
            onPropertyFilterChange={updateFilterForProperty}
            loadingProgress={loadingProgress}
            totalCount={totalCount ?? undefined}
          />
        )
      case "kanban":
        return (
          <KanbanView
            view={activeView as KanbanViewConfig}
            interventions={viewInterventions}
            loading={loading}
            error={error}
            onStatusChange={handleStatusChange}
          />
        )
      case "gallery":
        return (
          <GalleryView
            view={activeView as GalleryViewConfig}
            interventions={viewInterventions}
            loading={loading}
            error={error}
            onInterventionClick={handleNavigateToDetail}
            onLayoutOptionsChange={(options) => handleLayoutOptionsPatch(options)}
          />
        )
      case "calendar":
        return (
          <CalendarView
            view={activeView as CalendarViewConfig}
            interventions={viewInterventions}
            loading={loading}
            error={error}
            onInterventionClick={handleNavigateToDetail}
            onLayoutOptionsChange={(options) => handleLayoutOptionsPatch(options)}
          />
        )
      case "timeline":
        return (
          <TimelineView
            view={activeView as TimelineViewConfig}
            interventions={viewInterventions}
            loading={loading}
            error={error}
            onInterventionClick={handleNavigateToDetail}
            onLayoutOptionsChange={(options) => handleLayoutOptionsPatch(options)}
          />
        )
      default:
        return (
          <Interventions
            interventions={viewInterventions}
            loading={loading}
            error={error}
            selectedStatus={selectedStatus}
            displayedStatuses={displayedStatuses}
            onSelectStatus={handleSelectStatus}
            getCountByStatus={getCountByStatus}
            onStatusChange={handleStatusChange}
          />
        )
    }
  }

  useEffect(() => {
    if (!isReorderMode) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsReorderMode(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isReorderMode])

  return (
    <div className="space-y-4 p-6">
      <div className="space-y-2">
        {isReorderMode && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReorderMode(false)}
              className="animate-pulse bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
            >
              ESC
            </Button>
            <span>Réorganisez vos vues, puis appuyez sur ESC</span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-0">
            <ViewTabs
              views={views}
              activeViewId={activeViewId}
              onSelect={setActiveView}
              onReorder={reorderViews}
              onRenameView={handleRenameView}
              onDuplicateView={handleDuplicateView}
              onDeleteView={handleDeleteView}
              onResetDefault={resetViewToDefault}
              onConfigureColumns={setColumnConfigViewId}
              onToggleBadge={(id) => updateViewConfig(id, { showBadge: !views.find(v => v.id === id)?.showBadge })}
              isReorderMode={isReorderMode}
              onEnterReorderMode={() => setIsReorderMode(true)}
              interventionCounts={combinedViewCounts}
            />
          </div>
          {!isReorderMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0">
                  <MoreHorizontal className="h-4 w-4 mr-2" /> Plus
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-[80vh] overflow-y-auto">
                <div className="px-2 py-1.5">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions globales
                  </div>
                </div>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span>Nouvelle vue</span>
                    </div>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent align="end" className="w-64">
                    {NEW_VIEW_MENU_CHOICES.map(({ layout, label, Icon }) => (
                      <DropdownMenuItem
                        key={layout}
                        onSelect={(event) => {
                          event.preventDefault()
                          handleCreateView(layout)
                        }}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {activeView && (
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault()
                      updateViewConfig(activeView.id, { showBadge: !activeView.showBadge })
                    }}
                  >
                    <Hash className="mr-2 h-4 w-4" />
                    {activeView.showBadge ? "Masquer la pastille" : "Afficher la pastille"}
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <div className="px-2 py-1.5">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Filtres
                  </div>
                </div>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span>Afficher les filtres</span>
                    </div>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent align="end" className="w-64">
                    <DropdownMenuCheckboxItem
                      checked={showStatusFilter}
                      disabled={activeView?.layout !== "table"}
                      onCheckedChange={(checked) => {
                        if (!activeView || activeView.layout !== "table") return
                        updateLayoutOptions(activeView.id, { showStatusFilter: checked === true })
                      }}
                    >
                      Statut
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {activeView?.layout === "table" && (
                  <>
                    <DropdownMenuSeparator />

                    <div className="px-2 py-1.5">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Vue Tableau
                      </div>
                    </div>

                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault()
                        if (!activeView) return
                        setColumnConfigViewId(activeView.id)
                      }}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Configurer les colonnes…
                    </DropdownMenuItem>

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <div className="flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          <span>Style</span>
                        </div>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent align="end" className="w-72">
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                          Bordure & Ombrage
                        </DropdownMenuLabel>

                        <DropdownMenuCheckboxItem
                          checked={activeTableLayoutOptions?.showStatusBorder ?? false}
                          onCheckedChange={(checked) => {
                            handleLayoutOptionsPatch({ showStatusBorder: checked === true })
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-primary rounded-sm" />
                            Bordure colorée par statut
                          </div>
                        </DropdownMenuCheckboxItem>

                        {(activeTableLayoutOptions?.showStatusBorder ?? false) && (
                          <div className="px-2 py-2 ml-6">
                            <div className="text-xs text-muted-foreground mb-1.5">Largeur</div>
                            <div className="flex gap-1">
                              {(["s", "m", "l"] as const).map((size) => (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() => handleLayoutOptionsPatch({ statusBorderSize: size })}
                                  className={cn(
                                    "flex-1 px-2 py-1.5 text-xs rounded border transition-colors",
                                    (activeTableLayoutOptions?.statusBorderSize ?? "m") === size
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-background hover:bg-muted border-border",
                                  )}
                                >
                                  {size.toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <DropdownMenuSeparator className="my-1" />

                        <DropdownMenuCheckboxItem
                          checked={activeTableLayoutOptions?.coloredShadow ?? false}
                          onCheckedChange={(checked) => {
                            handleLayoutOptionsPatch({ coloredShadow: checked === true })
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-gradient-to-br from-primary/50 to-transparent rounded-sm" />
                            Ombrage coloré par statut
                          </div>
                        </DropdownMenuCheckboxItem>

                        {(activeTableLayoutOptions?.coloredShadow ?? false) && (
                          <div className="px-2 py-2 ml-6">
                            <div className="text-xs text-muted-foreground mb-1.5">Intensité</div>
                            <div className="flex gap-1">
                              {(["subtle", "normal", "strong"] as const).map((intensity) => (
                                <button
                                  key={intensity}
                                  type="button"
                                  onClick={() => handleLayoutOptionsPatch({ shadowIntensity: intensity })}
                                  className={cn(
                                    "flex-1 px-2 py-1.5 text-xs rounded border transition-colors",
                                    (activeTableLayoutOptions?.shadowIntensity ?? "normal") === intensity
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-background hover:bg-muted border-border",
                                  )}
                                >
                                  {intensity === "subtle" ? "Subtil" : intensity === "normal" ? "Normal" : "Fort"}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                          Apparence des lignes
                        </DropdownMenuLabel>

                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault()
                            handleLayoutOptionsPatch({ rowDisplayMode: "stripes" })
                          }}
                          className="flex items-start gap-2"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            {(activeTableLayoutOptions?.rowDisplayMode ?? "stripes") === "stripes" ? (
                              <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-primary" />
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-border" />
                            )}
                            <span>Stripes alternées</span>
                          </div>
                        </DropdownMenuItem>

                        {((activeTableLayoutOptions?.rowDisplayMode ?? "stripes") === "stripes") && (
                          <div className="px-2 py-1 ml-8">
                            <button
                              type="button"
                              onClick={() =>
                                handleLayoutOptionsPatch({
                                  useAccentColor: !(activeTableLayoutOptions?.useAccentColor ?? false),
                                })
                              }
                              className="flex items-center gap-2 text-xs hover:text-foreground transition-colors"
                            >
                              <div
                                className={cn(
                                  "w-3.5 h-3.5 rounded border flex items-center justify-center",
                                  activeTableLayoutOptions?.useAccentColor
                                    ? "bg-primary border-primary"
                                    : "border-border",
                                )}
                              >
                                {activeTableLayoutOptions?.useAccentColor && (
                                  <Check className="h-2.5 w-2.5 text-primary-foreground" />
                                )}
                              </div>
                              <span className="text-muted-foreground">Avec couleur d&apos;accentuation</span>
                            </button>
                          </div>
                        )}

                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault()
                            handleLayoutOptionsPatch({ rowDisplayMode: "gradient" })
                          }}
                          className="flex items-start gap-2"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            {activeTableLayoutOptions?.rowDisplayMode === "gradient" ? (
                              <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-primary" />
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-border" />
                            )}
                            <span>Dégradé par colonne</span>
                          </div>
                        </DropdownMenuItem>

                        {activeTableLayoutOptions?.rowDisplayMode === "gradient" && (
                          <div className="px-2 py-1 ml-8">
                            <button
                              type="button"
                              onClick={() =>
                                handleLayoutOptionsPatch({
                                  useAccentColor: !(activeTableLayoutOptions?.useAccentColor ?? false),
                                })
                              }
                              className="flex items-center gap-2 text-xs hover:text-foreground transition-colors"
                            >
                              <div
                                className={cn(
                                  "w-3.5 h-3.5 rounded border flex items-center justify-center",
                                  activeTableLayoutOptions?.useAccentColor
                                    ? "bg-primary border-primary"
                                    : "border-border",
                                )}
                              >
                                {activeTableLayoutOptions?.useAccentColor && (
                                  <Check className="h-2.5 w-2.5 text-primary-foreground" />
                                )}
                              </div>
                              <span className="text-muted-foreground">Avec couleur d&apos;accentuation</span>
                            </button>
                          </div>
                        )}

                        <DropdownMenuSeparator className="my-1" />

                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                          Densité des lignes
                        </DropdownMenuLabel>
                        <div className="px-2 py-2">
                          <div className="flex flex-col gap-1">
                            {ROW_DENSITY_OPTIONS.map(({ value, label }) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() =>
                                  handleLayoutOptionsPatch({
                                    rowDensity: value,
                                    dense: value === "dense" || value === "ultra-dense",
                                  })
                                }
                                className={cn(
                                  "w-full px-2 py-1.5 text-xs rounded border text-left transition-colors",
                                  activeRowDensity === value
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background hover:bg-muted border-border",
                                )}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </>
                )}

                <DropdownMenuSeparator />

                <div className="px-2 py-1.5">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Paramètres globaux
                  </div>
                </div>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <div className="flex items-center gap-2">
                      <CurrentModeIcon className="h-4 w-4" />
                      <span>Mode d&apos;affichage</span>
                    </div>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent align="end" className="w-64">
                    {MODE_OPTIONS.map((option) => {
                      const OptionIcon = ModeIcons[option.mode]
                      const isActiveMode = preferredMode === option.mode
                      return (
                        <DropdownMenuItem
                          key={option.mode}
                          onSelect={(event) => {
                            event.preventDefault()
                            setPreferredMode(option.mode)
                          }}
                          className={isActiveMode ? "bg-muted" : undefined}
                        >
                          <div className="flex items-start gap-3">
                            <OptionIcon />
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium leading-none">{option.label}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      )
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault()
                        router.push("/settings/interface")
                      }}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Modifier la vue par défaut
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />
                {/* DESIGN v1.4 - Anciens filtres avancés masqués temporairement */}
                {false && (
                  <div className="px-2 py-2 space-y-2">
                    {/* Ancien contenu du menu Plus de FiltersBar */}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* DESIGN v1.4 - FiltersBar masquée, accessible via bouton "Plus" */}
      {false && (
        <FiltersBar
          search={search}
          onSearch={setSearch}
          users={usersForFilter}
          user={selectedUser}
          onUser={handleSelectUser}
          dateRange={dateRange}
          onDateRange={handleDateRangeChange}
          sortField={sortField}
          onSortField={setSortField}
          sortDir={sortDir}
          onSortDir={setSortDir}
          displayedStatuses={displayedStatuses}
          selectedStatus={selectedStatus}
          onSelectStatus={handleSelectStatus}
          pinnedStatuses={workflowPinnedStatuses}
          onPinStatus={handlePinStatus}
          onUnpinStatus={handleUnpinStatus}
          additionalStatuses={additionalStatuses}
          getCountByStatus={getCountByStatus}
          workflow={workflowConfig}
        />
      )}

      {/* DESIGN v1.4 - FiltersBar Status affichée conditionnellement */}
      {showStatusFilter && (
        <div className="flex items-center gap-2 flex-wrap pb-4 border-b">
          <div className="text-sm text-muted-foreground">Statut:</div>
          <button
            onClick={() => handleSelectStatus(null)}
            className={`status-chip ${selectedStatus === null ? "bg-foreground/90 text-background ring-2 ring-foreground/20" : "bg-muted text-foreground hover:bg-muted/80"} transition-[opacity,transform,shadow] duration-150 ease-out`}
          >
            Toutes ({getCountByStatus(null)})
          </button>
          {displayedStatuses.map((status) => {
            const label = INTERVENTION_STATUS[status]?.label ?? mapStatusToDb(status)
            const Icon = INTERVENTION_STATUS[status]?.icon ?? Settings
            return (
              <button
                key={status}
                onClick={() => handleSelectStatus(status)}
                className={`status-chip status-${label} ${selectedStatus === status ? "ring-2 ring-foreground/20" : "hover:shadow-card"} transition-[opacity,transform,shadow] duration-150 ease-out`}
                title={label}
              >
                <span className="inline-flex items-center">
                  <Icon className="h-3.5 w-3.5 mr-1" />
                  {label}
                </span>{" "}
                ({getCountByStatus(status)})
              </button>
            )
          })}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              if (!activeView || activeView.layout !== "table") return
              updateLayoutOptions(activeView.id, { showStatusFilter: false })
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {renderActiveView()}

      <ColumnConfigurationModal
        view={views.find((view) => view.id === columnConfigViewId) ?? null}
        onUpdateColumns={(viewId, visibleProperties) => {
          updateViewConfig(viewId, { visibleProperties })
          if (viewId === activeViewId) {
            setColumnConfigViewId(null)
          }
        }}
        onUpdateLayoutOptions={(viewId, patch) => {
          updateLayoutOptions(viewId, patch)
        }}
        onClose={() => setColumnConfigViewId(null)}
      />
    </div>
  )
}
