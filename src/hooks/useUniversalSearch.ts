"use client"

import * as React from "react"
import { universalSearch } from "@/lib/api/v2/search"
import type { GroupedSearchResults } from "@/types/search"

const SEARCH_DEBOUNCE_MS = 300

export interface UseUniversalSearchReturn {
  query: string
  setQuery: (value: string) => void
  results: GroupedSearchResults | null
  isSearching: boolean
  error: string | null
  clearSearch: () => void
}

export function useUniversalSearch(): UseUniversalSearchReturn {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<GroupedSearchResults | null>(null)
  const [isSearching, setIsSearching] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const latestRequestRef = React.useRef(0)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleQueryChange = React.useCallback((nextQuery: string) => {
    setQuery(nextQuery)
  }, [])

  const clearSearch = React.useCallback(() => {
    latestRequestRef.current += 1
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    setQuery("")
    setResults(null)
    setIsSearching(false)
    setError(null)
  }, [])

  React.useEffect(() => {
    const trimmed = query.trim()

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    if (trimmed.length < 2) {
      latestRequestRef.current += 1
      setResults(null)
      setIsSearching(false)
      setError(null)
      return
    }

    setIsSearching(true)
    const requestId = ++latestRequestRef.current

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await universalSearch(trimmed)
        if (latestRequestRef.current === requestId) {
          setResults(response)
          setError(null)
        }
      } catch (err) {
        console.error("[useUniversalSearch] search error", err)
        if (latestRequestRef.current === requestId) {
          setResults(null)
          setError(err instanceof Error ? err.message : "Erreur lors de la recherche")
        }
      } finally {
        if (latestRequestRef.current === requestId) {
          setIsSearching(false)
        }
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [query])

  return {
    query,
    setQuery: handleQueryChange,
    results,
    isSearching,
    error,
    clearSearch,
  }
}
