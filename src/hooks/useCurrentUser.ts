"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase-client"
import { useEffect } from "react"

interface CurrentUser {
  id: string
  code_gestionnaire?: string | null
  username?: string | null
  email?: string | null
  firstname?: string | null
  lastname?: string | null
  prenom?: string | null
  nom?: string | null
  surnom?: string | null
  color?: string | null
}

export function useCurrentUser() {
  const queryClient = useQueryClient()
  
  // Listener pour invalider le cache lors des changements d'auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Invalider le cache lors des événements critiques
      if (event === 'SIGNED_OUT') {
        // Déconnexion : supprimer complètement le cache
        queryClient.removeQueries({ queryKey: ["currentUser"] })
        // Nettoyer aussi sessionStorage pour l'animation
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('revealTransition')
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Connexion ou refresh token : invalider pour forcer un refetch
        queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [queryClient])
  
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async (): Promise<CurrentUser | null> => {
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token

      if (!token) {
        return null
      }

      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store", // Ne pas mettre en cache HTTP
      })

      if (!response.ok) {
        throw new Error("Impossible de récupérer l'utilisateur")
      }

      const payload = await response.json()
      return payload?.user ?? null
    },
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
    gcTime: 10 * 60 * 1000, // Garde en cache 10 minutes
    retry: 1,
    // Refetch automatique quand la fenêtre reprend le focus (sécurité)
    refetchOnWindowFocus: true,
    // Refetch automatique quand la connexion réseau revient
    refetchOnReconnect: true,
  })
}


