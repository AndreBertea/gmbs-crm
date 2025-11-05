"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import type { GroupedSearchResults } from "@/types/search"
import { SearchSection } from "@/components/search/SearchSection"

interface UniversalSearchResultsProps {
  results: GroupedSearchResults | null
  isSearching: boolean
  error: string | null
  query: string
  onItemClick?: (id: string, type: "artisan" | "intervention") => void
  onClose?: () => void
}

const SCROLL_DEBOUNCE_MS = 50

type FlatItem = {
  id: string
  type: "artisan" | "intervention"
}

export function UniversalSearchResults({ results, isSearching, error, query, onItemClick, onClose }: UniversalSearchResultsProps) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const [canScrollUp, setCanScrollUp] = React.useState(false)
  const [canScrollDown, setCanScrollDown] = React.useState(false)
  const scrollTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeIndex, setActiveIndex] = React.useState(-1)

  const evaluateScroll = React.useCallback(() => {
    const element = scrollRef.current
    if (!element) {
      setCanScrollUp(false)
      setCanScrollDown(false)
      return
    }

    const { scrollTop, clientHeight, scrollHeight } = element
    setCanScrollUp(scrollTop > 2)
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 2)
  }, [])

  React.useEffect(() => {
    evaluateScroll()
  }, [results, evaluateScroll])

  React.useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    const onScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      scrollTimeoutRef.current = setTimeout(() => {
        evaluateScroll()
        scrollTimeoutRef.current = null
      }, SCROLL_DEBOUNCE_MS)
    }

    element.addEventListener("scroll", onScroll)
    return () => {
      element.removeEventListener("scroll", onScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = null
      }
    }
  }, [evaluateScroll])

  const hasResults = Boolean(results && (results.artisans.total > 0 || results.interventions.total > 0))
  const totalCount = (results?.artisans.total ?? 0) + (results?.interventions.total ?? 0)
  const searchTimeLabel = results ? `${totalCount} résultat${totalCount > 1 ? "s" : ""} en ${results.searchTime} ms` : null

  const artisanTopScore = results?.artisans.items[0]?.score ?? 0
  const interventionTopScore = results?.interventions.items[0]?.score ?? 0

  const sectionOrder: Array<"artisan" | "intervention"> = React.useMemo(() => {
    if (!results) return ["artisan", "intervention"]
    if (results.context === "artisan") return ["artisan", "intervention"]
    if (results.context === "intervention") return ["intervention", "artisan"]
    return artisanTopScore >= interventionTopScore
      ? ["artisan", "intervention"]
      : ["intervention", "artisan"]
  }, [results, artisanTopScore, interventionTopScore])

  // Create flat list of all items in display order for keyboard navigation
  const flatItems: FlatItem[] = React.useMemo(() => {
    if (!results || !hasResults) return []
    const items: FlatItem[] = []
    
    sectionOrder.forEach((type) => {
      if (type === "artisan" && results.artisans.total > 0) {
        results.artisans.items.forEach((item) => {
          items.push({ id: item.data.id, type: "artisan" })
        })
      } else if (type === "intervention" && results.interventions.total > 0) {
        results.interventions.items.forEach((item) => {
          items.push({ id: item.data.id, type: "intervention" })
        })
      }
    })
    
    return items
  }, [results, hasResults, sectionOrder])

  // Reset active index when results change
  React.useEffect(() => {
    setActiveIndex(-1)
  }, [results])

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape doit toujours fonctionner, même sans résultats
      if (e.key === "Escape") {
        e.preventDefault()
        if (onClose) {
          onClose()
        }
        return
      }

      // Les autres touches nécessitent des résultats
      if (flatItems.length === 0) return

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((prev) => {
          // Si aucun élément n'est sélectionné, sélectionner le premier
          if (prev === -1) return 0
          return prev < flatItems.length - 1 ? prev + 1 : prev
        })
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0))
      } else if (e.key === "Enter") {
        e.preventDefault()
        // Si activeIndex === -1, ouvrir le premier résultat
        const indexToOpen = activeIndex >= 0 ? activeIndex : 0
        const item = flatItems[indexToOpen]
        if (item && onItemClick) {
          onItemClick(item.id, item.type)
        }
      } else if (e.key === "Tab") {
        // Laisser Tab naviguer naturellement, mais mettre à jour activeIndex
        // pour suivre le focus
        e.preventDefault()
        if (e.shiftKey) {
          // Shift+Tab : aller vers le précédent
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1))
        } else {
          // Tab : aller vers le suivant
          setActiveIndex((prev) => {
            if (prev === -1) return 0
            return prev < flatItems.length - 1 ? prev + 1 : 0
          })
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [flatItems, activeIndex, onItemClick, onClose])

  const activeItem = activeIndex >= 0 && activeIndex < flatItems.length ? flatItems[activeIndex] : null
  const activeItemId = activeItem?.id ?? null
  const activeItemDomId = activeItem ? `search-result-${activeItem.type}-${activeItem.id}` : undefined

  const handleItemClick = React.useCallback((id: string, type: "artisan" | "intervention") => {
    if (onItemClick) {
      onItemClick(id, type)
    }
  }, [onItemClick])

  return (
    <div
      className="absolute top-full right-0 z-50 mt-2 w-[calc(100vw-2rem)] max-w-[600px] rounded-lg border bg-popover shadow-2xl animate-in fade-in-0 slide-in-from-top-2 duration-200 md:w-[600px]"
      role="listbox"
      aria-label="Résultats de la recherche"
      aria-activedescendant={activeItemDomId}
    >
      <div className="relative max-h-[500px] overflow-hidden">
        <div ref={scrollRef} className="max-h-[500px] overflow-y-auto">
          {isSearching && !hasResults ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Recherche en cours…</span>
            </div>
          ) : null}

          {!isSearching && error ? (
            <div className="px-6 py-8 text-center text-sm text-destructive">
              Erreur de recherche, réessayez
            </div>
          ) : null}

          {!isSearching && !error && results && !hasResults ? (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              Aucun résultat pour « {query} »
            </div>
          ) : null}

          {results && hasResults
            ? sectionOrder.map((type) => {
                if (type === "artisan") {
                  if (results.artisans.total === 0) return null
                  return (
                    <SearchSection
                      key="artisan"
                      type="artisan"
                      items={results.artisans.items}
                      total={results.artisans.total}
                      hasMore={results.artisans.hasMore}
                      query={query}
                      onItemClick={handleItemClick}
                      activeItemId={activeItemId}
                    />
                  )
                }
                if (results.interventions.total === 0) return null
                return (
                  <SearchSection
                    key="intervention"
                    type="intervention"
                    items={results.interventions.items}
                    total={results.interventions.total}
                    hasMore={results.interventions.hasMore}
                    query={query}
                    onItemClick={handleItemClick}
                    activeItemId={activeItemId}
                  />
                )
              })
            : null}
        </div>

        {canScrollUp ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-popover to-transparent" />
        ) : null}
        {canScrollDown ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-popover to-transparent" />
        ) : null}
      </div>

      <div className="flex items-center justify-between px-4 py-2 text-[11px] text-muted-foreground border-t">
        <div className="flex items-center gap-2">
          {isSearching && hasResults ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {searchTimeLabel ? <span>⚡ {searchTimeLabel}</span> : null}
        </div>
        {results ? (
          <span className="text-xs text-muted-foreground/70">
            Contexte: {results.context === "mixed" ? "mixte" : results.context}
          </span>
        ) : null}
      </div>
    </div>
  )
}
