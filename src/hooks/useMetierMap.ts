import { useEffect, useState } from "react"

import { referenceApi } from "@/lib/reference-api"

type MetierMap = {
  byLabel: Record<string, string>
  byCode: Record<string, string>
}

const buildMetierMap = (
  metiers: Array<{ id: string; code: string; label: string }>,
): MetierMap => {
  const byLabel: Record<string, string> = {}
  const byCode: Record<string, string> = {}

  metiers.forEach((metier) => {
    const { id, label, code } = metier
    if (!id) {
      return
    }

    if (label) {
      byLabel[label.toLowerCase()] = id
    }

    if (code) {
      byCode[code.toLowerCase()] = id
    }
  })

  return { byLabel, byCode }
}

export function useMetierMap() {
  const [metierMap, setMetierMap] = useState<MetierMap>({ byLabel: {}, byCode: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    referenceApi
      .getMetiers()
      .then((metiers) => {
        if (!mounted) return
        const data = Array.isArray(metiers) ? metiers : []
        setMetierMap(buildMetierMap(data))
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

  const nameToId = (name: string | string[] | undefined): string | string[] | undefined => {
    if (!name) return undefined

    const convert = (value: string): string | undefined => {
      const trimmed = value.trim()
      if (!trimmed) return undefined
      const lower = trimmed.toLowerCase()
      return metierMap.byLabel[lower] ?? metierMap.byCode[lower]
    }

    if (Array.isArray(name)) {
      const ids = name
        .map((value) => convert(String(value)))
        .filter((value): value is string => Boolean(value))
      return ids.length ? ids : undefined
    }

    return convert(String(name))
  }

  return {
    metierMap,
    loading,
    error,
    nameToId,
  }
}
