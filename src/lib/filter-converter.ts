import type { ViewFilter } from "@/types/intervention-views"
import type { GetAllParams } from "@/lib/supabase-api-v2"

export interface FilterConversionContext {
  statusCodeToId: (code: string | string[]) => string | string[] | undefined
  userCodeToId: (code: string | string[]) => string | string[] | undefined
  currentUserId?: string
}

/**
 * Convertit les ViewFilter en filtres serveur compatibles avec l'API
 * Retourne { serverFilters, clientFilters } pour séparer les filtres serveur/client
 */
export function convertViewFiltersToServerFilters(
  filters: ViewFilter[],
  context: FilterConversionContext,
): {
  serverFilters: Partial<GetAllParams>
  clientFilters: ViewFilter[]
} {
  const serverFilters: Partial<GetAllParams> = {}
  const clientFilters: ViewFilter[] = []

  for (const filter of filters) {
    // Filtre sur statusValue → statut (serveur)
    if (filter.property === "statusValue") {
      if (filter.operator === "eq" && typeof filter.value === "string") {
        const statusId = context.statusCodeToId(filter.value)
        if (statusId && typeof statusId === "string") {
          serverFilters.statut = statusId
        } else {
          clientFilters.push(filter) // Fallback côté client si conversion échoue
        }
      } else if (filter.operator === "in" && Array.isArray(filter.value)) {
        const statusIds = context.statusCodeToId(filter.value)
        if (statusIds && Array.isArray(statusIds) && statusIds.length > 0) {
          serverFilters.statut = statusIds
        } else {
          clientFilters.push(filter)
        }
      } else {
        clientFilters.push(filter)
      }
      continue
    }

    // Filtre sur attribueA → user (serveur)
    if (filter.property === "attribueA") {
      if (filter.operator === "eq" && typeof filter.value === "string") {
        // Gérer CURRENT_USER_PLACEHOLDER
        if (filter.value === "CURRENT_USER" || filter.value === context.currentUserId) {
          if (context.currentUserId) {
            serverFilters.user = context.currentUserId
          } else {
            clientFilters.push(filter)
          }
        } else {
          const userId = context.userCodeToId(filter.value)
          if (userId && typeof userId === "string") {
            serverFilters.user = userId
          } else {
            clientFilters.push(filter)
          }
        }
      } else if (filter.operator === "in" && Array.isArray(filter.value)) {
        const userIds = filter.value
          .map((v) => {
            if (v === "CURRENT_USER" || v === context.currentUserId) {
              return context.currentUserId
            }
            return context.userCodeToId(v)
          })
          .filter((id): id is string => Boolean(id))
        if (userIds.length > 0) {
          serverFilters.user = userIds
        } else {
          clientFilters.push(filter)
        }
      } else if (filter.operator === "is_empty") {
        // Pour les vues sans assignation (ex: Market)
        serverFilters.user = null
      } else {
        clientFilters.push(filter)
      }
      continue
    }

    // Filtre sur dateIntervention → startDate/endDate (serveur)
    if (filter.property === "dateIntervention" || filter.property === "date") {
      if (filter.operator === "between") {
        if (filter.value && typeof filter.value === "object" && !Array.isArray(filter.value)) {
          const { from, to } = filter.value as { from?: string; to?: string }
          if (from) serverFilters.startDate = from
          if (to) serverFilters.endDate = to
        } else if (Array.isArray(filter.value) && filter.value.length >= 2) {
          if (filter.value[0]) serverFilters.startDate = String(filter.value[0])
          if (filter.value[1]) serverFilters.endDate = String(filter.value[1])
        } else {
          clientFilters.push(filter)
        }
      } else if (filter.operator === "gte" && filter.value) {
        serverFilters.startDate = String(filter.value)
      } else if (filter.operator === "lte" && filter.value) {
        serverFilters.endDate = String(filter.value)
      } else {
        clientFilters.push(filter)
      }
      continue
    }

    // Filtres non supportés côté serveur → côté client
    // Exemples : isCheck, artisan, marge, etc.
    clientFilters.push(filter)
  }

  return { serverFilters, clientFilters }
}

