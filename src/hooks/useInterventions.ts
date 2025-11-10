import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { interventionsApiV2, type GetAllParams } from "@/lib/supabase-api-v2"
import type { InterventionView } from "@/types/intervention-view"
import { onRouteChanged } from "@/lib/navigation-tracker"

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
  const lastLoadTimeRef = useRef<number>(0)
  const isFirstLoadRef = useRef(true)
  const isFetchingRef = useRef(false)
  const lastRequestParamsRef = useRef<string>("")
  const interventionsRef = useRef<InterventionView[]>([])

  const [interventions, setInterventions] = useState<InterventionView[]>([])
  const [loading, setLoading] = useState<boolean>(autoLoad)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState<number>(0)

  // Mettre à jour la ref quand les interventions changent
  useEffect(() => {
    interventionsRef.current = interventions
  }, [interventions])

  useEffect(() => {
    // Réinitialiser les refs au montage du composant pour forcer le rechargement
    isMountedRef.current = true
    isFirstLoadRef.current = true
    lastRequestParamsRef.current = ""
    lastLoadTimeRef.current = 0
    
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const filtersKey = useMemo(() => JSON.stringify(serverFilters ?? {}), [serverFilters])
  const fieldsKey = useMemo(() => JSON.stringify(fields ?? []), [fields])

  const normalizedFilters = useMemo(() => {
    if (!serverFilters) return {}

    const result: Partial<ServerFilters> = {}
    const entries = Object.entries(serverFilters) as Array<
      [keyof ServerFilters, ServerFilters[keyof ServerFilters]]
    >

    for (const [key, value] of entries) {
      if (value !== undefined && value !== null) {
        // TypeScript a du mal avec l'inférence ici, on utilise une assertion
        ;(result as any)[key] = value
      }
    }

    return result as ServerFilters
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

  // Fonction helper pour vérifier le throttling avant d'appeler fetchAll
  const shouldFetch = useCallback(() => {
    const timeSinceLastLoad = Date.now() - lastLoadTimeRef.current
    return timeSinceLastLoad > 5000
  }, [])

  const fetchAll = useCallback(async (skipThrottle = false) => {
    // Éviter les appels simultanés
    if (isFetchingRef.current) {
      console.log(`[useInterventions] Appel bloqué: requête déjà en cours`)
      return
    }

    // Créer une clé pour les paramètres de requête pour éviter les appels dupliqués
    const requestKey = JSON.stringify(requestParams)
    
    // Éviter les appels dupliqués avec les mêmes paramètres (sauf pour refresh manuel)
    if (!skipThrottle && requestKey === lastRequestParamsRef.current && !isFirstLoadRef.current) {
      console.log(`[useInterventions] Appel bloqué: paramètres identiques à la dernière requête`)
      return
    }

    // Vérifier le throttling sauf si explicitement ignoré (pour refresh manuel ou premier chargement)
    const isFirstLoad = isFirstLoadRef.current
    if (!skipThrottle && !isFirstLoad && !shouldFetch()) {
      console.log(`[useInterventions] Appel bloqué: throttling (dernier chargement il y a ${Date.now() - lastLoadTimeRef.current}ms)`)
      return
    }

    console.log(`[useInterventions] Démarrage de la requête avec paramètres:`, requestParams)
    isFetchingRef.current = true
    lastRequestParamsRef.current = requestKey
    requestIdRef.current += 1
    const requestId = requestIdRef.current
    setLoading(true)
    setError(null)

    try {
      const result = await interventionsApiV2.getAll(requestParams)

      // Vérifier si cette requête est toujours la requête active
      const isActiveRequest = isMountedRef.current && requestId === requestIdRef.current

      if (!isActiveRequest) {
        // Cette requête a été annulée par une nouvelle requête, ne rien faire
        console.log(`[useInterventions] Requête ${requestId} annulée, requête active: ${requestIdRef.current}`)
        isFetchingRef.current = false
        return
      }

      // Mettre à jour le state seulement si c'est la requête active
      console.log(`[useInterventions] Mise à jour des données pour la requête ${requestId}, ${result.data.length} interventions`)
      
      // Log pour diagnostiquer les disparitions d'interventions
      const previousInterventions = interventionsRef.current
      if (previousInterventions.length > 0 && result.data.length !== previousInterventions.length) {
        const previousIds = new Set(previousInterventions.map(i => i.id))
        const newIds = new Set(result.data.map(i => i.id))
        const disappeared = Array.from(previousIds).filter(id => !newIds.has(id))
        const appeared = Array.from(newIds).filter(id => !previousIds.has(id))
        
        if (disappeared.length > 0) {
          console.warn(`[useInterventions] ⚠️ ${disappeared.length} intervention(s) ont disparu:`, disappeared.slice(0, 5))
        }
        if (appeared.length > 0) {
          console.log(`[useInterventions] ✅ ${appeared.length} nouvelle(s) intervention(s) apparue(s):`, appeared.slice(0, 5))
        }
      }
      
      setInterventions(result.data)
      interventionsRef.current = result.data // Mettre à jour la ref pour les prochains logs
      setTotalCount(result.total ?? result.data.length)
      lastLoadTimeRef.current = Date.now()
      isFirstLoadRef.current = false
      setLoading(false)
    } catch (err) {
      // Vérifier si cette requête est toujours la requête active
      const isActiveRequest = isMountedRef.current && requestId === requestIdRef.current

      if (!isActiveRequest) {
        // Cette requête a été annulée par une nouvelle requête, ne rien faire
        console.log(`[useInterventions] Requête ${requestId} annulée (erreur), requête active: ${requestIdRef.current}`)
        isFetchingRef.current = false
        return
      }

      const message =
        err instanceof Error ? err.message : "Erreur lors du chargement des interventions"

      console.error(`[useInterventions] Erreur lors du chargement:`, err)
      setInterventions([])
      setTotalCount(0)
      setError(message)
      isFirstLoadRef.current = false
      setLoading(false)
    } finally {
      // Toujours remettre isFetchingRef à false
      isFetchingRef.current = false
      
      // Vérifier une dernière fois si cette requête est toujours active avant de modifier loading
      // (au cas où une nouvelle requête aurait démarré entre temps)
      if (isMountedRef.current && requestId === requestIdRef.current) {
        console.log(`[useInterventions] Fin de la requête ${requestId}, loading déjà mis à false dans try/catch`)
      } else {
        console.log(`[useInterventions] Requête ${requestId} terminée mais n'est plus active (active: ${requestIdRef.current})`)
      }
    }
  }, [requestParams, shouldFetch])

  // Recharger quand requestParams change (changement de vue, filtres, etc.)
  useEffect(() => {
    if (!autoLoad) {
      return
    }

    // Pour le premier chargement, ignorer le throttling. Pour les suivants, l'appliquer
    // Utiliser isFirstLoadRef.current pour déterminer si on doit skip le throttling
    const shouldSkipThrottle = isFirstLoadRef.current
    fetchAll(shouldSkipThrottle)
  }, [autoLoad, fetchAll, viewId])

  // Écouter les événements de changement de route
  useEffect(() => {
    if (!autoLoad || typeof window === "undefined") {
      return
    }

    const unsubscribe = onRouteChanged((detail) => {
      // Si on arrive sur /interventions depuis une autre page, recharger
      if (detail.pathname === "/interventions" && detail.previousPathname !== "/interventions") {
        // Réinitialiser les refs pour forcer le rechargement au retour sur la page
        isFirstLoadRef.current = true
        lastRequestParamsRef.current = ""
        lastLoadTimeRef.current = 0
        console.log("🔄 Retour sur la page interventions, rechargement des données")
        // Forcer le rechargement en ignorant le throttling
        fetchAll(true)
      }
    })

    return unsubscribe
  }, [autoLoad, fetchAll, shouldFetch])

  // Écouter les événements de visibilité de la page pour recharger si nécessaire
  useEffect(() => {
    if (!autoLoad || typeof window === "undefined") {
      return
    }

    const handleVisibilityChange = () => {
      // Si la page redevient visible, recharger avec throttling
      if (document.visibilityState === "visible") {
        if (shouldFetch()) {
          console.log("🔄 Page redevient visible, rechargement des interventions")
          fetchAll()
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [autoLoad, fetchAll, shouldFetch])

  const refresh = useCallback(async () => {
    // Ne pas vider la liste immédiatement pour éviter les disparitions visuelles
    // Le loading state gérera l'affichage pendant le rechargement
    // refresh() ignore le throttling pour forcer un rechargement immédiat
    return fetchAll(true)
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
