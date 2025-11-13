import { format } from "date-fns"
import { fr } from "date-fns/locale"
import type { ViewFilter } from "@/types/intervention-views"
import type { PropertySchema } from "@/types/property-schema"

const numberFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 })

export function formatFilterSummary(filter: ViewFilter, schema: PropertySchema): string {
  if (!filter.value) {
    switch (filter.operator) {
      case "is_empty":
        return "Vide"
      case "is_not_empty":
        return "Non vide"
      default:
        return "Actif"
    }
  }

  switch (schema.type) {
    case "text": {
      if (filter.operator === "contains" || filter.operator === "eq") {
        return String(filter.value)
      }
      return "Actif"
    }
    case "number": {
      if (filter.operator === "between") {
        const filterValue = filter.value
        if (filterValue && typeof filterValue === "object" && !Array.isArray(filterValue)) {
          const { from, to } = filterValue as { from?: number; to?: number }
          if (from !== undefined && to !== undefined) {
            return `${from} – ${to}`
          }
          if (from !== undefined) {
            return `≥ ${from}`
          }
          if (to !== undefined) {
            return `≤ ${to}`
          }
        }
      } else {
        return numberFormatter.format(Number(filter.value))
      }
      return "Actif"
    }
    case "date": {
      if (filter.operator === "between") {
        const filterValue = filter.value
        if (filterValue && typeof filterValue === "object" && !Array.isArray(filterValue)) {
          const { from, to } = filterValue as { from?: string; to?: string }
          if (from && to) {
            try {
              const fromDate = new Date(from)
              const toDate = new Date(to)
              return `${format(fromDate, "dd/MM/yyyy", { locale: fr })} – ${format(toDate, "dd/MM/yyyy", { locale: fr })}`
            } catch {
              return "Plage de dates"
            }
          }
        }
      } else if (typeof filter.value === "string") {
        try {
          const date = new Date(filter.value)
          return format(date, "dd/MM/yyyy", { locale: fr })
        } catch {
          return String(filter.value)
        }
      }
      return "Actif"
    }
    case "checkbox": {
      if (typeof filter.value === "boolean") {
        return filter.value ? "Oui" : "Non"
      }
      return "Actif"
    }
    case "select":
    case "multi_select": {
      if (Array.isArray(filter.value)) {
        if (filter.value.length <= 2) {
          return filter.value
            .map((v) => {
              const option = schema.options?.find((opt) => opt.value === v)
              return option?.label ?? String(v)
            })
            .join(", ")
        }
        return `${filter.value.length} sélectionnés`
      } else {
        const option = schema.options?.find((opt) => opt.value === filter.value)
        return option?.label ?? String(filter.value)
      }
    }
    case "user": {
      if (Array.isArray(filter.value)) {
        if (filter.value.length <= 2) {
          return filter.value.map((v) => String(v)).join(", ")
        }
        return `${filter.value.length} utilisateurs`
      } else {
        return String(filter.value)
      }
    }
    default:
      return String(filter.value)
  }
}

