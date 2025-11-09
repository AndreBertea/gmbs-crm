import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase-client"

export interface AvatarMetadata {
  hash: string | null
  sizes: Record<string, string>
  mime_preferred: string
  baseUrl: string | null
}

export type NearbyArtisan = {
  id: string
  displayName: string
  distanceKm: number
  telephone: string | null
  email: string | null
  adresse: string | null
  ville: string | null
  codePostal: string | null
  lat: number
  lng: number
  prenom: string | null
  nom: string | null
  statut_id: string | null
  photoProfilMetadata: AvatarMetadata | null
}

type NearbyArtisanState = {
  artisans: NearbyArtisan[]
  loading: boolean
  error: string | null
}

type NearbyArtisanOptions = {
  limit?: number
  maxDistanceKm?: number
  sampleSize?: number
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180

  const R = 6371 // Earth radius km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export function useNearbyArtisans(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  options?: NearbyArtisanOptions,
): NearbyArtisanState {
  const [state, setState] = useState<NearbyArtisanState>({
    artisans: [],
    loading: false,
    error: null,
  })

  const { limit, maxDistanceKm, sampleSize } = useMemo(
    () => ({
      limit: options?.limit ?? 5,
      maxDistanceKm: options?.maxDistanceKm ?? 100,
      sampleSize: options?.sampleSize ?? 150,
    }),
    [options?.limit, options?.maxDistanceKm, options?.sampleSize],
  )

  useEffect(() => {
    let cancelled = false

    async function fetchArtisans() {
      if (latitude == null || longitude == null) {
        setState({ artisans: [], loading: false, error: null })
        return
      }

      setState((prev) => ({ ...prev, loading: true, error: null }))

      const { data, error } = await supabase
        .from("artisans")
        .select(
          [
            "id",
            "prenom",
            "nom",
            "raison_sociale",
            "telephone",
            "email",
            "adresse_intervention",
            "code_postal_intervention",
            "ville_intervention",
            "intervention_latitude",
            "intervention_longitude",
            "statut_id",
            "artisan_attachments(kind, url, content_hash, derived_sizes, mime_preferred, mime_type)",
          ].join(", "),
        )
        .not("intervention_latitude", "is", null)
        .not("intervention_longitude", "is", null)
        .limit(sampleSize)

      if (cancelled) return

      if (error) {
        setState({ artisans: [], loading: false, error: error.message })
        return
      }

      const enriched =
        data?.map((row: any) => {
          const lat = Number(row.intervention_latitude)
          const lng = Number(row.intervention_longitude)

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return null
          }

          const distanceKm = haversineDistanceKm(latitude, longitude, lat, lng)

          // Récupérer la photo de profil depuis les attachments
          const attachments = Array.isArray(row.artisan_attachments) 
            ? row.artisan_attachments 
            : [];
          
          const photoProfilAttachment = attachments.find(
            (att: any) => att?.kind === "photo_profil" && att?.url && att.url.trim() !== ""
          );

          // Construire les métadonnées de la photo de profil
          const photoProfilMetadata: AvatarMetadata | null = photoProfilAttachment ? {
            hash: photoProfilAttachment.content_hash || null,
            sizes: photoProfilAttachment.derived_sizes || {},
            mime_preferred: photoProfilAttachment.mime_preferred || photoProfilAttachment.mime_type || 'image/jpeg',
            baseUrl: photoProfilAttachment.url || null
          } : null;

          return {
            id: row.id,
            displayName:
              row.raison_sociale ||
              [row.prenom, row.nom].filter(Boolean).join(" ").trim() ||
              row.id,
            distanceKm,
            telephone: row.telephone ?? null,
            email: row.email ?? null,
            adresse: row.adresse_intervention ?? null,
            ville: row.ville_intervention ?? null,
            codePostal: row.code_postal_intervention ?? null,
            lat,
            lng,
            prenom: row.prenom ?? null,
            nom: row.nom ?? null,
            statut_id: row.statut_id ?? null,
            photoProfilMetadata,
          } satisfies NearbyArtisan
        }) ?? []

      const filtered = enriched
        .filter((item): item is NearbyArtisan => Boolean(item) && item.distanceKm >= 0)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .filter((artisan) => artisan.distanceKm <= maxDistanceKm)
        .slice(0, limit)

      setState({ artisans: filtered, loading: false, error: null })
    }

    fetchArtisans()

    return () => {
      cancelled = true
    }
  }, [latitude, longitude, limit, maxDistanceKm, sampleSize])

  return state
}
