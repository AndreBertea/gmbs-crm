"use client"

import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase-client"

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
  })
}


