"use client"

import { useEffect, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase-client"
import { preloadCriticalDataAsync } from "@/lib/preload-critical-data"

/**
 * Provider qui gère un seul listener onAuthStateChange global
 * pour éviter les listeners multiples quand plusieurs composants utilisent useCurrentUser
 */
export function AuthStateListenerProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
        
        // Précharger les données critiques après connexion pour une réactivité optimale
        // On le fait de manière asynchrone pour ne pas bloquer le rendu
        if (event === 'SIGNED_IN') {
          // Utiliser un délai court pour laisser le temps aux cookies d'être définis
          setTimeout(() => {
            preloadCriticalDataAsync(queryClient)
          }, 200)
        }
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [queryClient])
  
  return <>{children}</>
}

