"use client"

import { type ReactNode, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Refetch automatique pour sécurité
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        // Retry avec backoff exponentiel
        retry: (failureCount, error: any) => {
          // Ne pas retry sur les erreurs 401 (non autorisé)
          if (error?.status === 401) return false
          return failureCount < 2
        },
        // Stale time par défaut (peut être overridé par chaque query)
        staleTime: 30 * 1000, // 30 secondes par défaut
      },
    },
  }))
  
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

export default ReactQueryProvider
