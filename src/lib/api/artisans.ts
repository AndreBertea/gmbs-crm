export type ArtisanSearchResult = {
  id: string
  prenom: string | null
  nom: string | null
  email: string | null
  telephone: string | null
  metiers: string[] | null
  ville: string | null
  codePostal: string | null
}

type SearchParams = {
  query?: string
  limit?: number
}

export async function searchArtisansLocally({ query, limit = 10 }: SearchParams = {}): Promise<ArtisanSearchResult[]> {
  // TODO: Implement proper artisan search with Prisma
  // For now, return empty array to avoid build errors
  console.debug("[artisans] search placeholder", { query, limit })
  return []
}
