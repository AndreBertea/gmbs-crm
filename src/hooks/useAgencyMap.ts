import { useEffect, useState } from "react"

import { referenceApi } from "@/lib/reference-api"

type AgencyMap = {
  byLabel: Record<string, string>
  byCode: Record<string, string>
}

const buildAgencyMap = (agencies: Array<{ id: string; code: string; label: string }>): AgencyMap => {
  const byLabel: Record<string, string> = {}
  const byCode: Record<string, string> = {}

  agencies.forEach((agency) => {
    const { id, code, label } = agency
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

export function useAgencyMap() {
  const [agencyMap, setAgencyMap] = useState<AgencyMap>({ byLabel: {}, byCode: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    referenceApi
      .getAgencies()
      .then((agencies) => {
        if (!mounted) return
        setAgencyMap(buildAgencyMap(agencies ?? []))
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
      return agencyMap.byLabel[lower] ?? agencyMap.byCode[lower]
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
    agencyMap,
    loading,
    error,
    nameToId,
  }
}
