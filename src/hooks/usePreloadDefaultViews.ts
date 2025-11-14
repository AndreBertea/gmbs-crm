"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useInterventionViews } from "@/hooks/useInterventionViews"
import { useInterventionStatusMap } from "@/hooks/useInterventionStatusMap"
import { useUserMap } from "@/hooks/useUserMap"
import { usePreloadViews } from "@/hooks/usePreloadInterventions"
import { getHasPreloaded } from "@/lib/preload-flag"

/**
 * Hook pour récupérer l'utilisateur actuel depuis TanStack Query
 * Évite les appels multiples à /api/auth/me
 */
function useCurrentUserFromQuery() {
  const { data: currentUserData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "include",
      })
      if (!response.ok) {
        if (response.status === 401) return null
        throw new Error("Unable to fetch current user")
      }
      const payload = await response.json()
      return payload?.user ?? null
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  })

  return currentUserData?.id ?? undefined
}

/**
 * Hook pour précharger les vues par défaut en arrière-plan avec TanStack Query
 * Précharge les 6 vues par défaut (excluant calendrier) pour un accès instantané
 * DÉSACTIVÉ si preloadCriticalData a déjà été exécuté pour éviter les doublons
 */
export function usePreloadDefaultViews() {
  const { views, isReady } = useInterventionViews()
  const { codeToId: statusCodeToId } = useInterventionStatusMap()
  const { nameToId: userCodeToId } = useUserMap()
  const currentUserId = useCurrentUserFromQuery() // Utiliser le hook partagé au lieu de refaire l'appel
  const [isPreloading, setIsPreloading] = useState(false)
  
  // Vérifier si le préchargement global a déjà été fait
  const hasGlobalPreloaded = getHasPreloaded()

  // Vues par défaut à précharger (exclure calendrier)
  const defaultViewsToPreload = useMemo(() => {
    if (!isReady) return []
    return views.filter((view) => view.isDefault && view.id !== "calendar")
  }, [views, isReady])

  // Précharger avec TanStack Query SEULEMENT si le préchargement global n'a pas déjà été fait
  // Cela évite les doublons de requêtes
  usePreloadViews(
    hasGlobalPreloaded ? [] : defaultViewsToPreload, // Désactiver si déjà préchargé
    {
      useLight: true, // Utiliser l'endpoint léger pour le warm-up
      statusCodeToId,
      userCodeToId,
      currentUserId,
    }
  )

  useEffect(() => {
    if (defaultViewsToPreload.length > 0) {
      setIsPreloading(true)
      // Simuler le chargement (TanStack Query gère le préchargement en arrière-plan)
      const timer = setTimeout(() => {
        setIsPreloading(false)
        console.log(`[usePreloadDefaultViews] 🎉 Préchargement des vues par défaut initié avec TanStack Query`)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [defaultViewsToPreload.length])

  return {
    preloadedViews: defaultViewsToPreload.map((v) => v.id),
    isPreloading,
  }
}

