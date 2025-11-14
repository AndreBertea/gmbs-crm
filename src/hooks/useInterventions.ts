import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { interventionsApiV2, type GetAllParams } from "@/lib/supabase-api-v2"
import type { InterventionView } from "@/types/intervention-view"
import { onRouteChanged } from "@/lib/navigation-tracker"
import { canPreloadNextPage, setActiveViewId } from "@/hooks/interventions-preload-manager"

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
  page?: number
}

export interface UseInterventionsReturn {
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

// ============================================
// CACHE GLOBAL PARTAGÉ
// ============================================

interface CacheEntry {
  data: InterventionView[]
  total: number
  timestamp: number
  params: GetAllParams
}

const globalCache = new Map<string, CacheEntry>()
const CACHE_TTL = 60000 // ✅ 60 secondes (augmenté de 30s)
const STALE_THRESHOLD = 30000 // ✅ 30 secondes (revalidation silencieuse)
const MAX_CACHE_SIZE = 20 // Limiter à 20 entrées
const SESSION_STORAGE_KEY = "gmbs:interventions:cache"
const SESSION_STORAGE_VERSION = "1.0" // Version pour invalider les anciens caches

/**
 * Crée une clé de cache basée sur les paramètres serveur uniquement
 */
function getCacheKey(params: GetAllParams): string {
  const serverParams = {
    statut: params.statut,
    user: params.user,
    agence: params.agence,
    artisan: params.artisan,
    metier: params.metier,
    startDate: params.startDate,
    endDate: params.endDate,
    search: params.search,
    offset: params.offset,
    limit: params.limit,
    // ✅ Ajouter fields pour différencier les requêtes
    fields: params.fields ? [...params.fields].sort() : undefined,
  }
  return JSON.stringify(serverParams)
}

/**
 * Charge le cache depuis sessionStorage au démarrage
 */
function loadCacheFromSessionStorage(): void {
  if (typeof window === "undefined") return

  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!stored) return

    const parsed = JSON.parse(stored)
    if (parsed.version !== SESSION_STORAGE_VERSION) {
      // Version différente, nettoyer
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
      return
    }

    const now = Date.now()
    for (const [key, entry] of Object.entries(parsed.entries || {})) {
      const cacheEntry = entry as CacheEntry
      const age = now - cacheEntry.timestamp

      // Ne charger que les entrées valides
      if (age < CACHE_TTL) {
        globalCache.set(key, cacheEntry)
      }
    }

    console.log(`[useInterventions] 📦 Cache restauré depuis sessionStorage: ${globalCache.size} entrées`)
  } catch (err) {
    console.warn("[useInterventions] ⚠️ Erreur lors du chargement du cache depuis sessionStorage:", err)
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
  }
}

/**
 * Sauvegarde le cache dans sessionStorage (uniquement pour la liste générale)
 */
function saveCacheToSessionStorage(): void {
  if (typeof window === "undefined") return

  try {
    // Sauvegarder uniquement la liste générale (offset: 0, pas de filtres)
    const generalListKey = getCacheKey({ limit: 100, offset: 0 })
    const generalListEntry = globalCache.get(generalListKey)

    if (generalListEntry) {
      const toStore = {
        version: SESSION_STORAGE_VERSION,
        entries: {
          [generalListKey]: generalListEntry,
        },
      }
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(toStore))
    }
  } catch (err) {
    // Ignorer les erreurs (quota dépassé, mode privé, etc.)
    console.warn("[useInterventions] ⚠️ Impossible de sauvegarder le cache dans sessionStorage:", err)
  }
}

// Charger le cache au démarrage
if (typeof window !== "undefined") {
  loadCacheFromSessionStorage()
}

/**
 * Récupère les données depuis le cache si elles existent et sont encore valides
 */
function getFromCache(params: GetAllParams): { 
  data: InterventionView[]; 
  total: number;
  isStale: boolean;
} | null {
  const key = getCacheKey(params)
  const cached = globalCache.get(key)

  if (!cached) {
    return null
  }

  const age = Date.now() - cached.timestamp
  
  // Cache expiré
  if (age > CACHE_TTL) {
    globalCache.delete(key)
    return null
  }

  return { 
    data: cached.data, 
    total: cached.total,
    isStale: age > STALE_THRESHOLD // ✅ Marquer comme stale si > 30s
  }
}

/**
 * Stocke les données dans le cache
 */
function setCache(params: GetAllParams, data: InterventionView[], total: number): void {
  const key = getCacheKey(params)
  globalCache.set(key, {
    data,
    total,
    timestamp: Date.now(),
    params,
  })

  // Limiter la taille du cache (garder les entrées les plus récentes)
  if (globalCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(globalCache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp) // Plus ancien en premier
    const oldest = entries[0]
    globalCache.delete(oldest[0])
  }

  // ✅ Sauvegarder dans sessionStorage si c'est la liste générale
  const isGeneralList = !params.statut && !params.user && !params.agence && 
                        !params.artisan && !params.metier && !params.startDate && 
                        !params.endDate && !params.search && params.offset === 0
  
  if (isGeneralList) {
    saveCacheToSessionStorage()
  }
}

/**
 * Précharge les données pour une requête donnée (en arrière-plan)
 */
export async function preloadInterventions(params: GetAllParams): Promise<void> {
  const key = getCacheKey(params)
  
  // Vérifier si déjà en cache
  const cached = getFromCache(params)
  if (cached) {
    console.log(`[useInterventions] ✅ Préchargement: données déjà en cache pour ${key}`)
    return
  }

  try {
    console.log(`[useInterventions] 🔄 Préchargement en arrière-plan: ${key}`)
    const result = await interventionsApiV2.getAll(params)
    setCache(params, result.data, result.total ?? result.data.length)
    console.log(`[useInterventions] ✅ Préchargement réussi: ${result.data.length} interventions`)
  } catch (err) {
    console.warn(`[useInterventions] ⚠️ Échec préchargement:`, err)
  }
}

export function useInterventions(options: UseInterventionsOptions = {}): UseInterventionsReturn {
  const {
    viewId,
    autoLoad = true,
    limit = DEFAULT_LIMIT,
    fields,
    serverFilters,
    page = 1,
  } = options

  const isMountedRef = useRef(true)
  const requestIdRef = useRef(0)
  const lastLoadTimeRef = useRef<number>(0)
  const isFirstLoadRef = useRef(true)
  const isFetchingRef = useRef(false)
  const lastRequestParamsRef = useRef<string>("")
  const interventionsRef = useRef<InterventionView[]>([])
  const previousViewIdRef = useRef<string | undefined>(undefined)
  // ✅ Refs pour gérer les requêtes concurrentes et éviter les données obsolètes
  const inFlightRequestKeyRef = useRef<string>("")
  const inFlightViewIdRef = useRef<string | undefined>(undefined)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [interventions, setInterventions] = useState<InterventionView[]>([])
  const [loading, setLoading] = useState<boolean>(autoLoad)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(page)

  // Mettre à jour la ref quand les interventions changent
  useEffect(() => {
    interventionsRef.current = interventions
  }, [interventions])

  // Détecter le changement de vue
  useEffect(() => {
    const previousViewId = previousViewIdRef.current
    if (previousViewId !== undefined && previousViewId !== viewId) {
      console.log(`[useInterventions] 🔄 Changement de vue détecté: ${previousViewId} -> ${viewId}`)
      
      // ✅ Réinitialiser les refs de requête en cours pour forcer une nouvelle requête
      // Cela permet d'annuler toute requête en cours pour l'ancienne vue
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      inFlightRequestKeyRef.current = ""
      inFlightViewIdRef.current = undefined
      isFetchingRef.current = false
      
      // ✅ Ne PAS vider les données immédiatement
      // Laisser fetchAll vérifier le cache et afficher les données si disponibles
      // Si le cache existe, les données seront affichées instantanément
      // Si le cache n'existe pas, fetchAll affichera le loading
      
      // Réinitialiser la page à 1 lors du changement de vue
      setCurrentPage(1)
    }
    previousViewIdRef.current = viewId
  }, [viewId])

  // ✅ Mettre à jour la vue active dans le gestionnaire
  useEffect(() => {
    setActiveViewId(viewId ?? null)
    return () => {
      setActiveViewId(null)
    }
  }, [viewId])

  useEffect(() => {
    // Réinitialiser les refs au montage du composant pour forcer le rechargement
    isMountedRef.current = true
    isFirstLoadRef.current = true
    lastRequestParamsRef.current = ""
    lastLoadTimeRef.current = 0
    // ✅ Réinitialiser les refs de requête en cours
    inFlightRequestKeyRef.current = ""
    inFlightViewIdRef.current = undefined
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    return () => {
      isMountedRef.current = false
      // ✅ Nettoyer à la destruction du composant
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
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
  }, [serverFilters])

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
    return (currentPage - 1) * limit
  }, [currentPage, limit])

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

  // Fonction helper pour vérifier le throttling avant d'appeler fetchAll
  const shouldFetch = useCallback(() => {
    const timeSinceLastLoad = Date.now() - lastLoadTimeRef.current
    return timeSinceLastLoad > 5000
  }, [])

  const fetchAll = useCallback(async (skipThrottle = false, useCache = true) => {
    // Créer une clé pour les paramètres de requête pour éviter les appels dupliqués
    const requestKey = JSON.stringify(requestParams)
    const currentOffset = requestParams.offset || 0
    const previousOffset = lastRequestParamsRef.current 
      ? (JSON.parse(lastRequestParamsRef.current).offset || 0)
      : 0
    
    // Détecter si c'est un changement de page (offset différent)
    const isPageChange = currentOffset !== previousOffset
    
    // ✅ Vérifier si c'est une nouvelle requête (paramètres différents ou viewId différent)
    const isNewRequest = requestKey !== inFlightRequestKeyRef.current || viewId !== inFlightViewIdRef.current
    
    // ✅ Annuler la requête précédente si c'est une nouvelle requête
    if (isFetchingRef.current && isNewRequest) {
      console.log(`[useInterventions] 🔄 Nouvelle requête détectée (key: ${requestKey !== inFlightRequestKeyRef.current ? 'différente' : 'identique'}, viewId: ${viewId !== inFlightViewIdRef.current ? 'différent' : 'identique'}), annulation de la précédente`)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      // Réinitialiser le flag pour permettre la nouvelle requête
      isFetchingRef.current = false
    }
    
    // ✅ Bloquer uniquement si c'est exactement la même requête
    if (isFetchingRef.current && !isNewRequest) {
      console.log(`[useInterventions] Appel bloqué: requête identique déjà en cours`)
      return
    }
    
    // Vérifier le cache AVANT l'appel API (sauf si skipThrottle = true pour refresh forcé)
    if (useCache && !skipThrottle) {
      const cached = getFromCache(requestParams)
      if (cached) {
        console.log(`[useInterventions] ✅ Cache hit pour ${getCacheKey(requestParams)}`)
        
        // ✅ Vérifier que le viewId correspond toujours avant d'afficher
        // Si une nouvelle vue a été sélectionnée entre-temps, ignorer le cache
        // On accepte le cache seulement si :
        // 1. Le viewId correspond à celui de la requête en cours, OU
        // 2. Aucune requête n'est en cours (première fois) ET le cache correspond aux paramètres actuels
        const viewIdMatches = viewId === inFlightViewIdRef.current
        const noRequestInFlight = !inFlightViewIdRef.current && !isFetchingRef.current
        
        if (viewIdMatches || noRequestInFlight) {
          setInterventions(cached.data)
          interventionsRef.current = cached.data
          setTotalCount(cached.total)
          setLoading(false)
          lastLoadTimeRef.current = Date.now()
          isFirstLoadRef.current = false
          lastRequestParamsRef.current = requestKey
          
          // ✅ Mettre à jour les refs de requête en cours
          inFlightRequestKeyRef.current = requestKey
          inFlightViewIdRef.current = viewId
          
          // ✅ Revalidation silencieuse si stale
          if (cached.isStale) {
            console.log(`[useInterventions] 🔄 Revalidation silencieuse en arrière-plan`)
            // Lancer la revalidation sans bloquer l'UI
            fetchAll(false, false).catch(() => {
              // Ignorer les erreurs de revalidation silencieuse
            })
          }
          
          // ✅ Précharger la page suivante UNIQUEMENT si :
          // 1. Toutes les vues sont préchargées
          // 2. La vue actuelle est active
          // 3. Il y a une page suivante
          if (canPreloadNextPage(viewId ?? null)) {
            const total = cached.total
            const hasNextPage = currentOffset + (requestParams.limit || DEFAULT_LIMIT) < total
            
            if (hasNextPage) {
              const nextPageParams = {
                ...requestParams,
                offset: currentOffset + (requestParams.limit || DEFAULT_LIMIT),
              }
              setTimeout(() => {
                console.log(`[useInterventions] 🔄 Préchargement page suivante (vue active: ${viewId})`)
                preloadInterventions(nextPageParams)
              }, 1000)
            }
          } else {
            console.log(`[useInterventions] ⏸️ Préchargement page suivante différé (vues en cours ou vue inactive)`)
          }
        } else {
          console.log(`[useInterventions] ⏸️ Cache hit ignoré: viewId a changé (${inFlightViewIdRef.current} -> ${viewId}), nouvelle requête nécessaire`)
        }
        
        return
      }
      console.log(`[useInterventions] ❌ Cache miss, appel API nécessaire`)
    }
    
    // Éviter les appels dupliqués avec les mêmes paramètres (sauf pour refresh manuel ou changement de page)
    if (!skipThrottle && !isPageChange && requestKey === lastRequestParamsRef.current && !isFirstLoadRef.current) {
      console.log(`[useInterventions] Appel bloqué: paramètres identiques à la dernière requête`)
      return
    }

    // Vérifier le throttling sauf si explicitement ignoré (pour refresh manuel, premier chargement ou changement de page)
    const isFirstLoad = isFirstLoadRef.current
    if (!skipThrottle && !isFirstLoad && !isPageChange && !shouldFetch()) {
      console.log(`[useInterventions] Appel bloqué: throttling (dernier chargement il y a ${Date.now() - lastLoadTimeRef.current}ms)`)
      return
    }
    
    if (isPageChange) {
      console.log(`[useInterventions] Changement de page détecté: ${previousOffset} -> ${currentOffset}, skipThrottle: ${skipThrottle}`)
    }

    console.log(`[useInterventions] Démarrage de la requête avec paramètres:`, requestParams)
    
    // ✅ Créer un nouvel AbortController pour cette requête
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    // ✅ Stocker la clé et le viewId de la requête en cours
    inFlightRequestKeyRef.current = requestKey
    inFlightViewIdRef.current = viewId
    
    isFetchingRef.current = true
    lastRequestParamsRef.current = requestKey
    requestIdRef.current += 1
    const requestId = requestIdRef.current
    const currentViewId = viewId // ✅ Capturer le viewId au moment de la requête
    setLoading(true)
    setError(null)

    try {
      const result = await interventionsApiV2.getAll(requestParams)

      // ✅ Vérifier si la requête a été annulée
      if (abortController.signal.aborted) {
        console.log(`[useInterventions] Requête ${requestId} annulée (AbortController)`)
        isFetchingRef.current = false
        return
      }

      // ✅ Vérifier si cette requête est toujours active ET correspond au viewId actuel
      const isActiveRequest = isMountedRef.current && 
                             requestId === requestIdRef.current && 
                             currentViewId === viewId // ✅ Vérifier aussi le viewId

      if (!isActiveRequest) {
        // Cette requête a été annulée par une nouvelle requête ou un changement de vue
        const reason = requestId !== requestIdRef.current ? 'nouvelle requête' : 
                      currentViewId !== viewId ? `changement de vue (${currentViewId} -> ${viewId})` : 
                      'composant démonté'
        console.log(`[useInterventions] Requête ${requestId} obsolète (${reason}), ignorée`)
        isFetchingRef.current = false
        return
      }

      // Mettre à jour le state seulement si c'est la requête active
      console.log(`[useInterventions] Mise à jour des données pour la requête ${requestId}, ${result.data.length} interventions, offset: ${currentOffset} (précédent: ${previousOffset})`)
      
      // Log pour diagnostiquer les disparitions d'interventions
      const previousInterventions = interventionsRef.current
      
      if (previousInterventions.length > 0) {
        const previousIds = new Set(previousInterventions.map(i => i.id))
        const newIds = new Set(result.data.map(i => i.id))
        const disappeared = Array.from(previousIds).filter(id => !newIds.has(id))
        const appeared = Array.from(newIds).filter(id => !previousIds.has(id))
        
        console.log(`[useInterventions] Comparaison - Previous offset: ${previousOffset}, Current offset: ${currentOffset}`)
        console.log(`[useInterventions] Previous count: ${previousInterventions.length}, New count: ${result.data.length}`)
        
        if (disappeared.length > 0) {
          console.warn(`[useInterventions] ⚠️ ${disappeared.length} intervention(s) ont disparu:`, disappeared.slice(0, 5))
        }
        if (appeared.length > 0) {
          console.log(`[useInterventions] ✅ ${appeared.length} nouvelle(s) intervention(s) apparue(s):`, appeared.slice(0, 5))
        }
      }
      
      console.log(`[useInterventions] Appel de setInterventions avec ${result.data.length} interventions`)
      if (result.data.length > 0) {
        console.log(`[useInterventions] Première intervention ID: ${result.data[0].id}, Dernière intervention ID: ${result.data[result.data.length - 1].id}`)
      }
      // Forcer la mise à jour en créant un nouveau tableau
      setInterventions([...result.data])
      interventionsRef.current = result.data // Mettre à jour la ref pour les prochains logs
      const total = result.total ?? result.data.length
      setTotalCount(total)
      
      // Stocker dans le cache
      setCache(requestParams, result.data, total)
      
      lastLoadTimeRef.current = Date.now()
      isFirstLoadRef.current = false
      setLoading(false)
      
      // ✅ Précharger la page suivante UNIQUEMENT si :
      // 1. Toutes les vues sont préchargées
      // 2. La vue actuelle est active
      // 3. Il y a une page suivante
      if (canPreloadNextPage(viewId ?? null) && result.data.length > 0) {
        const hasNextPage = currentOffset + (requestParams.limit || DEFAULT_LIMIT) < total
        
        if (hasNextPage) {
          const nextPageParams = {
            ...requestParams,
            offset: currentOffset + (requestParams.limit || DEFAULT_LIMIT),
          }
          setTimeout(() => {
            console.log(`[useInterventions] 🔄 Préchargement page suivante (vue active: ${viewId})`)
            preloadInterventions(nextPageParams)
          }, 1000)
        }
      } else {
        console.log(`[useInterventions] ⏸️ Préchargement page suivante différé (vues en cours ou vue inactive)`)
      }
    } catch (err) {
      // ✅ Ignorer les erreurs d'abort
      if (abortController.signal.aborted) {
        console.log(`[useInterventions] Requête ${requestId} annulée (erreur d'abort)`)
        isFetchingRef.current = false
        return
      }

      // ✅ Vérifier si cette requête est toujours active ET correspond au viewId actuel
      const isActiveRequest = isMountedRef.current && 
                             requestId === requestIdRef.current && 
                             currentViewId === viewId

      if (!isActiveRequest) {
        const reason = requestId !== requestIdRef.current ? 'nouvelle requête' : 
                      currentViewId !== viewId ? `changement de vue (${currentViewId} -> ${viewId})` : 
                      'composant démonté'
        console.log(`[useInterventions] Requête ${requestId} obsolète (erreur, ${reason}), ignorée`)
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
      // ✅ Nettoyer seulement si c'est toujours la requête active
      if (requestId === requestIdRef.current && currentViewId === viewId) {
        isFetchingRef.current = false
        abortControllerRef.current = null
        // Ne pas réinitialiser inFlightRequestKeyRef et inFlightViewIdRef ici
        // car ils peuvent être utilisés par la prochaine requête
        console.log(`[useInterventions] Fin de la requête ${requestId}, nettoyage effectué`)
      } else {
        console.log(`[useInterventions] Requête ${requestId} terminée mais n'est plus active (active: ${requestIdRef.current}, viewId: ${viewId})`)
      }
    }
  }, [requestParams, shouldFetch, viewId]) // ✅ Ajouter viewId aux dépendances

  // Calculer le nombre total de pages
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalCount / limit))
  }, [totalCount, limit])

  // Réinitialiser à la page 1 quand les filtres changent
  useEffect(() => {
    setCurrentPage(1)
  }, [filtersKey, fieldsKey])

  // Recharger quand requestParams change (changement de vue, filtres, page, etc.)
  useEffect(() => {
    if (!autoLoad) {
      return
    }

    // Détecter si c'est un changement de vue (vérifier AVANT que le premier useEffect ne mette à jour la ref)
    // On utilise une variable locale pour capturer la valeur avant la mise à jour
    const currentPreviousViewId = previousViewIdRef.current
    const isViewChange = currentPreviousViewId !== undefined && currentPreviousViewId !== viewId
    
    // Si changement de vue, forcer le rechargement immédiatement (ignorer throttling)
    if (isViewChange) {
      console.log(`[useInterventions] 🔄 Changement de vue détecté dans useEffect, rechargement forcé`)
      fetchAll(true) // skipThrottle = true pour forcer le rechargement
      return
    }

    // Détecter si c'est un changement de page (offset différent)
    const currentOffset = requestParams.offset || 0
    const previousRequestKey = lastRequestParamsRef.current
    const previousOffset = previousRequestKey 
      ? (JSON.parse(previousRequestKey).offset || 0)
      : 0
    const isPageChange = currentOffset !== previousOffset

    // Pour le premier chargement ou changement de page, ignorer le throttling
    const shouldSkipThrottle = isFirstLoadRef.current || isPageChange
    
    console.log(`[useInterventions] useEffect déclenché - offset: ${currentOffset}, previousOffset: ${previousOffset}, isPageChange: ${isPageChange}, shouldSkipThrottle: ${shouldSkipThrottle}`)
    
    fetchAll(shouldSkipThrottle)
  }, [autoLoad, requestParams, viewId, fetchAll])

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
    // refresh() ignore le throttling et le cache pour forcer un rechargement immédiat
    return fetchAll(true, false) // skipThrottle = true, useCache = false
  }, [fetchAll])

  const goToPage = useCallback((newPage: number) => {
    const validPage = Math.max(1, Math.min(newPage, totalPages))
    setCurrentPage(validPage)
  }, [totalPages])

  const nextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages))
  }, [totalPages])

  const previousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1))
  }, [])

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
    currentPage,
    totalPages,
    refresh,
    goToPage,
    nextPage,
    previousPage,
    updateInterventionOptimistic,
  }
}
