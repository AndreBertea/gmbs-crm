import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { interventionsApiV2, type GetAllParams } from "@/lib/supabase-api-v2"
import type { InterventionView } from "@/types/intervention-view"

type ServerFilters = Pick<
  GetAllParams,
  "statut" | "agence" | "artisan" | "metier" | "user" | "startDate" | "endDate" | "search"
>

export interface UseInterventionsOptions {
  viewId?: string
  autoLoad?: boolean
  limit?: number
  fields?: string[]
  serverFilters?: ServerFilters
}

export interface UseInterventionsReturn {
  interventions: InterventionView[]
  loading: boolean
  error: string | null
  totalCount: number
  refresh: () => Promise<void>
  updateInterventionOptimistic: (id: string, updates: Partial<InterventionView>) => void
}

const DEFAULT_LIMIT = 10000

export function useInterventions(options: UseInterventionsOptions = {}): UseInterventionsReturn {
  const {
    viewId,
    autoLoad = true,
    limit = DEFAULT_LIMIT,
    fields,
    serverFilters,
  } = options

  const isMountedRef = useRef(true)
  const requestIdRef = useRef(0)

  const [interventions, setInterventions] = useState<InterventionView[]>([])
  const [loading, setLoading] = useState<boolean>(autoLoad)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState<number>(0)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const filtersKey = useMemo(() => JSON.stringify(serverFilters ?? {}), [serverFilters])
  const fieldsKey = useMemo(() => JSON.stringify(fields ?? []), [fields])

  const normalizedFilters = useMemo(() => {
    if (!serverFilters) return {}

    const entries = Object.entries(serverFilters) as Array<
      [keyof ServerFilters, ServerFilters[keyof ServerFilters]]
    >

    return entries.reduce<ServerFilters>((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value
      }
      return acc
    }, {})
  }, [filtersKey, serverFilters])

  const normalizedFields = useMemo(() => {
    if (!fields || fields.length === 0) return undefined
    const unique = Array.from(
      new Set(
        fields
          .map((field) => field?.trim())
          .filter((field): field is string => Boolean(field)),
      ),
    )
    return unique.length > 0 ? unique : undefined
  }, [fieldsKey, fields])

  const requestParams = useMemo(() => {
    const params: GetAllParams = {
      limit: Math.max(1, limit),
    }

    if (normalizedFields) {
      params.fields = normalizedFields
    }

    Object.entries(normalizedFilters).forEach(([key, value]) => {
      if (value !== undefined) {
        const target = params as Record<string, unknown>
        target[key] = value
      }
    })

    return params
  }, [limit, normalizedFields, normalizedFilters])

  const fetchAll = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)

    try {
      const result = await interventionsApiV2.getAll(requestParams)

      if (!isMountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      setInterventions(result.data)
      setTotalCount(result.total ?? result.data.length)
    } catch (err) {
      if (!isMountedRef.current || requestId !== requestIdRef.current) {
        return
      }

      const message =
        err instanceof Error ? err.message : "Erreur lors du chargement des interventions"

      setInterventions([])
      setTotalCount(0)
      setError(message)
    } finally {
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [requestParams])

  useEffect(() => {
    if (!autoLoad) {
      return
    }

    fetchAll()
  }, [autoLoad, fetchAll, viewId])

  const refresh = useCallback(async () => {
    setInterventions([])
    setTotalCount(0)
    return fetchAll()
  }, [fetchAll])

  const updateInterventionOptimistic = useCallback(
    (id: string, updates: Partial<InterventionView>) => {
      if (!id || !updates) return
      setInterventions((prev) =>
        prev.map((intervention) => (intervention.id === id ? { ...intervention, ...updates } : intervention)),
      )
    },
    [],
  )

  return {
    interventions,
    loading,
    error,
    totalCount: totalCount || interventions.length,
    refresh,
    updateInterventionOptimistic,
  }
}
