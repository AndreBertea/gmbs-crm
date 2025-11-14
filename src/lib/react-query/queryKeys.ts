import type { GetAllParams } from "@/lib/supabase-api-v2"

/**
 * Factory pour générer les clés de requête TanStack Query
 * Centralise toutes les clés pour faciliter l'invalidation ciblée
 */
export const interventionKeys = {
  /**
   * Clés pour les listes d'interventions
   */
  all: ["interventions"] as const,
  
  /**
   * Liste complète d'interventions avec filtres
   */
  lists: () => [...interventionKeys.all, "list"] as const,
  list: (params: GetAllParams) => [...interventionKeys.lists(), params] as const,
  
  /**
   * Liste légère d'interventions pour warm-up
   */
  lightLists: () => [...interventionKeys.all, "light"] as const,
  lightList: (params: GetAllParams) => [...interventionKeys.lightLists(), params] as const,
  
  /**
   * Résumé par vue (métadonnées sans données complètes)
   */
  summaries: () => [...interventionKeys.all, "summary"] as const,
  summary: (params: GetAllParams) => [...interventionKeys.summaries(), params] as const,
  
  /**
   * Détail d'une intervention par ID
   */
  details: () => [...interventionKeys.all, "detail"] as const,
  detail: (id: string, include?: string[]) => [...interventionKeys.details(), id, include] as const,
  
  /**
   * Invalider toutes les queries d'interventions
   */
  invalidateAll: () => interventionKeys.all,
  
  /**
   * Invalider toutes les listes (complètes et légères)
   */
  invalidateLists: () => [...interventionKeys.all, "list", "light"],
  
  /**
   * Invalider une vue spécifique par ses paramètres
   */
  invalidateView: (params: GetAllParams) => [
    interventionKeys.list(params),
    interventionKeys.lightList(params),
    interventionKeys.summary(params),
  ],
} as const

