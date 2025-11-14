import { useCallback, useEffect, useState } from "react"
import { referenceApi } from "@/lib/reference-api"

/**
 * Hook pour charger et cacher le mapping CODE → UUID des statuts
 * Utilisé pour convertir les codes de statut (EN_COURS, TERMINE, etc.) en UUIDs pour les requêtes SQL
 */
export function useInterventionStatusMap() {
  const [statusMap, setStatusMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    referenceApi
      .getInterventionStatuses()
      .then((statuses) => {
        if (!mounted) return
        const map: Record<string, string> = {}
        const addMapping = (key: string | null | undefined, id: string) => {
          if (!key) return
          const original = key
          const upper = key.toUpperCase()
          const normalized = key
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+/g, "_")
            .toUpperCase()

          map[original] = id
          map[upper] = id
          map[normalized] = id
        }

        for (const status of statuses) {
          addMapping(status.code, status.id)
          addMapping(status.label, status.id)
        }

        // Ajouter des alias pour les codes legacy (frontend) → codes BDD
        // Permet de résoudre "EN_COURS" → UUID de "INTER_EN_COURS"
        const interEnCoursId = map["INTER_EN_COURS"]
        const interTermineeId = map["INTER_TERMINEE"]
        if (interEnCoursId) {
          addMapping("EN_COURS", interEnCoursId)
        }
        if (interTermineeId) {
          addMapping("TERMINE", interTermineeId)
          addMapping("INTER_TERMINEES", interTermineeId) // Au cas où
        }
        
        setStatusMap(map)
        setLoading(false)
      })
      .catch((err) => {
        if (!mounted) return
        setError(err)
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  /**
   * Convertit un code de statut (ou array de codes) en UUID(s)
   * @param code - Code(s) de statut (ex: "EN_COURS" ou ["EN_COURS", "TERMINE"])
   * @returns UUID(s) correspondant(s)
   */
  const codeToId = useCallback((code: string | string[] | undefined): string | string[] | undefined => {
    if (!code) return undefined
    if (Array.isArray(code)) {
      return code.map((c) => statusMap[c]).filter(Boolean)
    }
    return statusMap[code]
  }, [statusMap])

  return { statusMap, loading, error, codeToId }
}
