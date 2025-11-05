import { HardHat, Wrench } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { SearchEntityType } from "@/types/search"

export const MATCH_LABELS: Record<string, string> = {
  code: "Code artisan",
  company: "Raison sociale",
  name: "Nom",
  telephone: "Téléphone",
  email: "Email",
  metier: "Métier",
  interventionId: "ID intervention",
  client: "Nom client",
  address: "Adresse",
  city: "Ville",
  postal: "Code postal",
  comments: "Commentaire",
  notes: "Consigne",
  assignedUser: "Gestionnaire assigné",
  assignedArtisan: "Artisan assigné",
}

export const getMatchLabel = (field?: string | null) => {
  if (!field) return "Résultat pertinent"
  return MATCH_LABELS[field] ?? field
}

export const SECTION_META: Record<
  SearchEntityType,
  {
    label: string
    icon: LucideIcon
  }
> = {
  artisan: {
    label: "Artisans",
    icon: HardHat,
  },
  intervention: {
    label: "Interventions",
    icon: Wrench,
  },
}

export const METIER_ICON_MAP: Record<string, string> = {
  PLOMBERIE: "🔧",
  CHAUFFAGE: "🔥",
  ELECTRICITE: "⚡",
  MACONNERIE: "🏗️",
  MACON: "🏗️",
  MENUISERIE: "🪚",
  VITRERIE: "🪟",
  SERRURERIE: "🔐",
  VOLET: "🪟",
  BRICOLAGE: "🧰",
}
