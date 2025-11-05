export const DOMAIN = {
  deals: "Interventions",
  contacts: "Artisans",
  dashboard: "Tableau de bord",
} as const

export type DomainKey = keyof typeof DOMAIN

export const t = (key: DomainKey) => DOMAIN[key]

