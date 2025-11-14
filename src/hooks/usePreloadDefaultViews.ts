"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase-client"
import { useInterventionViews } from "@/hooks/useInterventionViews"
import { useInterventionStatusMap } from "@/hooks/useInterventionStatusMap"
import { useUserMap } from "@/hooks/useUserMap"
import { usePreloadViews } from "@/hooks/usePreloadInterventions"

/**
 * Hook pour précharger les vues par défaut en arrière-plan avec TanStack Query
 * Précharge les 6 vues par défaut (excluant calendrier) pour un accès instantané
 */
export function usePreloadDefaultViews() {
  const { views, isReady } = useInterventionViews()
  const { codeToId: statusCodeToId } = useInterventionStatusMap()
  const { nameToId: userCodeToId } = useUserMap()
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined)
  const [isPreloading, setIsPreloading] = useState(false)

  // Récupérer l'utilisateur actuel
  useEffect(() => {
    let cancelled = false

    const resolveUser = async () => {
      try {
        const { data: session } = await supabase.auth.getSession()
        const token = session?.session?.access_token
        if (!token) {
          if (!cancelled) {
            setCurrentUserId(undefined)
          }
          return
        }

        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
        if (!response.ok) {
          throw new Error("Unable to fetch current user")
        }
        const payload = await response.json()
        const user = payload?.user ?? null
        const userId: string | undefined = user?.id ?? undefined
        if (!cancelled) {
          setCurrentUserId(userId)
        }
      } catch (error) {
        if (!cancelled) {
          setCurrentUserId(undefined)
        }
      }
    }

    resolveUser()
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      resolveUser()
    })

    return () => {
      cancelled = true
      authListener?.subscription.unsubscribe()
    }
  }, [])

  // Vues par défaut à précharger (exclure calendrier)
  const defaultViewsToPreload = useMemo(() => {
    if (!isReady) return []
    return views.filter((view) => view.isDefault && view.id !== "calendar")
  }, [views, isReady])

  // Précharger avec TanStack Query
  usePreloadViews(defaultViewsToPreload, {
    useLight: true, // Utiliser l'endpoint léger pour le warm-up
    statusCodeToId,
    userCodeToId,
    currentUserId,
  })

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

