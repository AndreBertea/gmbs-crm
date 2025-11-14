"use client"

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { interventionsApiV2, type GetAllParams } from "@/lib/supabase-api-v2"
import { interventionKeys } from "@/lib/react-query/queryKeys"
import type { InterventionViewDefinition } from "@/types/intervention-views"
import { convertViewFiltersToServerFilters } from "@/lib/filter-converter"

interface PreloadOptions {
  /**
   * Utiliser l'endpoint léger pour le préchargement (données minimales)
   * Par défaut: true pour réduire le volume de données
   */
  useLight?: boolean
}

/**
 * Précharge une vue spécifique avec TanStack Query
 */
export function usePreloadView(
  view: InterventionViewDefinition,
  options: PreloadOptions & {
    statusCodeToId: (code: string | string[]) => string | string[] | undefined
    userCodeToId: (code: string | string[]) => string | string[] | undefined
    currentUserId?: string
  }
) {
  const queryClient = useQueryClient()
  const { useLight = true } = options

  useEffect(() => {
    if (!view) return

    try {
      // Convertir les filtres de la vue en filtres serveur
      const { serverFilters } = convertViewFiltersToServerFilters(view.filters, {
        statusCodeToId: options.statusCodeToId,
        userCodeToId: options.userCodeToId,
        currentUserId: options.currentUserId,
      })

      // Créer les paramètres de requête
      const params: GetAllParams = {
        limit: 100,
        offset: 0,
        ...serverFilters,
      }

      // Précharger avec TanStack Query (utilise le dedup automatique)
      const queryKey = useLight
        ? interventionKeys.lightList(params)
        : interventionKeys.list(params)

      // Ajouter viewId à la clé pour permettre l'invalidation ciblée
      const fullQueryKey = view.id ? [...queryKey, view.id] : queryKey

      queryClient.prefetchQuery({
        queryKey: fullQueryKey,
        queryFn: async () => {
          if (useLight) {
            return await interventionsApiV2.getAllLight(params)
          }
          return await interventionsApiV2.getAll(params)
        },
        staleTime: 30 * 1000, // 30 secondes
      })

      console.log(`[usePreloadView] ✅ Vue "${view.title}" préchargée avec TanStack Query`)
    } catch (err) {
      console.warn(`[usePreloadView] ⚠️ Erreur lors du préchargement vue "${view.title}":`, err)
    }
  }, [view, queryClient, useLight, options])
}

/**
 * Précharge la liste générale (sans filtres) avec TanStack Query
 */
export function usePreloadGeneralList(options: PreloadOptions = {}) {
  const queryClient = useQueryClient()
  const { useLight = true } = options

  useEffect(() => {
    const params: GetAllParams = {
      limit: 100,
      offset: 0,
      // Pas de filtres = liste générale
    }

    const queryKey = useLight
      ? interventionKeys.lightList(params)
      : interventionKeys.list(params)

    queryClient.prefetchQuery({
      queryKey,
      queryFn: async () => {
        if (useLight) {
          return await interventionsApiV2.getAllLight(params)
        }
        return await interventionsApiV2.getAll(params)
      },
      staleTime: 30 * 1000, // 30 secondes
    })

    console.log(`[usePreloadGeneralList] ✅ Liste générale préchargée avec TanStack Query`)
  }, [queryClient, useLight])
}

/**
 * Précharge plusieurs vues en cascade avec TanStack Query
 */
export function usePreloadViews(
  views: InterventionViewDefinition[],
  options: PreloadOptions & {
    statusCodeToId: (code: string | string[]) => string | string[] | undefined
    userCodeToId: (code: string | string[]) => string | string[] | undefined
    currentUserId?: string
  }
) {
  const queryClient = useQueryClient()
  const { useLight = true } = options

  useEffect(() => {
    if (!views || views.length === 0) return

    console.log(`[usePreloadViews] 🚀 Démarrage préchargement de ${views.length} vues avec TanStack Query`)

    // Précharger chaque vue avec un délai progressif pour ne pas surcharger
    views.forEach((view, index) => {
      const delay = index * 500 // Délai progressif : 0ms, 500ms, 1000ms, etc.

      setTimeout(() => {
        try {
          // Convertir les filtres de la vue en filtres serveur
          const { serverFilters } = convertViewFiltersToServerFilters(view.filters, {
            statusCodeToId: options.statusCodeToId,
            userCodeToId: options.userCodeToId,
            currentUserId: options.currentUserId,
          })

          // Créer les paramètres de requête
          const params: GetAllParams = {
            limit: 100,
            offset: 0,
            ...serverFilters,
          }

          // Précharger avec TanStack Query
          const queryKey = useLight
            ? interventionKeys.lightList(params)
            : interventionKeys.list(params)

          // Ajouter viewId à la clé
          const fullQueryKey = view.id ? [...queryKey, view.id] : queryKey

          queryClient.prefetchQuery({
            queryKey: fullQueryKey,
            queryFn: async () => {
              if (useLight) {
                return await interventionsApiV2.getAllLight(params)
              }
              return await interventionsApiV2.getAll(params)
            },
            staleTime: 30 * 1000,
          })

          console.log(`[usePreloadViews] ✅ Vue "${view.title}" préchargée`)
        } catch (err) {
          console.warn(`[usePreloadViews] ⚠️ Erreur lors du préchargement vue "${view.title}":`, err)
        }
      }, delay)
    })
  }, [views, queryClient, useLight, options])
}

