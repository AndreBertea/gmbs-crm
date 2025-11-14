import { useCallback, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { interventionsApiV2, type GetAllParams } from "@/lib/supabase-api-v2"
import type { InterventionView } from "@/types/intervention-view"
import { interventionKeys } from "@/lib/react-query/queryKeys"

type ServerFilters = Pick<
  GetAllParams,
  "statut" | "agence" | "artisan" | "metier" | "user" | "startDate" | "endDate" | "search"
>

export interface UseInterventionsQueryOptions {
  viewId?: string
  autoLoad?: boolean
  limit?: number
  fields?: string[]
  serverFilters?: ServerFilters
  page?: number
  /**
   * Utiliser l'endpoint léger pour le warm-up (données minimales)
   * Par défaut: false (utilise l'endpoint complet)
   */
  useLight?: boolean
  /**
   * Désactiver la requête (pour contrôle manuel)
   */
  enabled?: boolean
}

export interface UseInterventionsQueryReturn {
  interventions: InterventionView[]
  loading: boolean
  error: string | null
  totalCount: number
  currentPage: number
  totalPages: number
  refresh: () => Promise<void>
  goToPage: (page: number) => void
  nextPage: () => void
  previousPage: () => void
  updateInterventionOptimistic: (id: string, updates: Partial<InterventionView>) => void
}

const DEFAULT_LIMIT = 100

export function useInterventionsQuery(
  options: UseInterventionsQueryOptions = {}
): UseInterventionsQueryReturn {
  const {
    viewId,
    autoLoad = true,
    limit = DEFAULT_LIMIT,
    fields,
    serverFilters,
    page = 1,
    useLight = false,
    enabled: enabledOption,
  } = options

  // Normaliser les filtres (supprimer les valeurs undefined/null)
  const normalizedFilters = useMemo(() => {
    if (!serverFilters) return {}

    const result: Partial<ServerFilters> = {}
    const entries = Object.entries(serverFilters) as Array<
      [keyof ServerFilters, ServerFilters[keyof ServerFilters]]
    >

    for (const [key, value] of entries) {
      if (value !== undefined && value !== null) {
        ;(result as any)[key] = value
      }
    }

    return result as ServerFilters
  }, [serverFilters])

  // Normaliser les champs
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
  }, [fields])

  // Calculer l'offset depuis la page courante
  const offset = useMemo(() => {
    return (page - 1) * limit
  }, [page, limit])

  // Construire les paramètres de requête
  const requestParams = useMemo(() => {
    const params: GetAllParams = {
      limit: Math.max(1, limit),
      offset,
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
  }, [limit, offset, normalizedFields, normalizedFilters])

  // Déterminer si la requête doit être activée
  const enabled = enabledOption !== undefined ? enabledOption : autoLoad

  // Utiliser l'endpoint approprié (light ou complet)
  const queryFn = useCallback(async () => {
    if (useLight) {
      return await interventionsApiV2.getAllLight(requestParams)
    }
    return await interventionsApiV2.getAll(requestParams)
  }, [requestParams, useLight])

  // Clé de requête avec viewId pour permettre l'invalidation par vue
  const queryKey = useMemo(() => {
    const baseKey = useLight
      ? interventionKeys.lightList(requestParams)
      : interventionKeys.list(requestParams)
    
    // Ajouter viewId à la clé si fourni pour permettre l'invalidation ciblée
    return viewId ? [...baseKey, viewId] : baseKey
  }, [requestParams, useLight, viewId])

  // Requête TanStack Query
  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn,
    enabled,
    // Stale time spécifique : 30s pour revalidation silencieuse
    staleTime: 30 * 1000,
    // Garder les données précédentes pendant le chargement (pagination fluide)
    placeholderData: (previousData) => previousData,
  })

  // Extraire les données de la réponse
  const interventions = useMemo(() => data?.data ?? [], [data?.data])
  const totalCount = useMemo(() => data?.total ?? 0, [data?.total])

  // Calculer le nombre total de pages
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalCount / limit))
  }, [totalCount, limit])

  // Fonction de refresh
  const refresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  // Navigation de pagination (sera gérée par le composant parent via le paramètre page)
  const goToPage = useCallback((newPage: number) => {
    // Cette fonction sera gérée par le composant parent qui contrôle le paramètre page
    console.warn("[useInterventionsQuery] goToPage doit être géré par le composant parent via le paramètre page")
  }, [])

  const nextPage = useCallback(() => {
    console.warn("[useInterventionsQuery] nextPage doit être géré par le composant parent via le paramètre page")
  }, [])

  const previousPage = useCallback(() => {
    console.warn("[useInterventionsQuery] previousPage doit être géré par le composant parent via le paramètre page")
  }, [])

  // Mise à jour optimiste (sera gérée par les mutations TanStack Query plus tard)
  const updateInterventionOptimistic = useCallback(
    (id: string, updates: Partial<InterventionView>) => {
      console.warn("[useInterventionsQuery] updateInterventionOptimistic sera géré par useInterventionsMutations")
    },
    [],
  )

  return {
    interventions,
    loading: isLoading,
    error: queryError ? (queryError instanceof Error ? queryError.message : String(queryError)) : null,
    totalCount,
    currentPage: page,
    totalPages,
    refresh,
    goToPage,
    nextPage,
    previousPage,
    updateInterventionOptimistic,
  }
}

