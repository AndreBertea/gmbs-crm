"use client"

import { type ReactNode, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time : 30s (revalidation silencieuse après 30s)
        staleTime: 30 * 1000,
        // Cache time : 5min (garder en cache 5min après dernier usage)
        gcTime: 5 * 60 * 1000, // Renommé de cacheTime à gcTime dans v5
        // Ne pas refetch automatiquement au focus pour éviter les rechargements intempestifs
        refetchOnWindowFocus: false,
        // Refetch à la reconnexion pour récupérer les données à jour
        refetchOnReconnect: true,
        // Retry avec backoff exponentiel
        retry: (failureCount, error: any) => {
          // Ne pas retry sur les erreurs 401 (non autorisé)
          if (error?.status === 401) return false
          return failureCount < 2
        },
        // Garder les données précédentes pendant le chargement (pour pagination fluide)
        placeholderData: (previousData: unknown) => previousData,
      },
    },
  }))
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}

export default ReactQueryProvider
