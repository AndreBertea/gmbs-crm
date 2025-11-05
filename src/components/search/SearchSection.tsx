import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { SECTION_META, getMatchLabel } from "@/components/search/constants"
import { ArtisanResultItem } from "@/components/search/ArtisanResultItem"
import { InterventionResultItem } from "@/components/search/InterventionResultItem"
import type { SearchResult, ArtisanSearchRecord, InterventionSearchRecord } from "@/types/search"

type ArtisanSectionProps = {
  type: "artisan"
  items: Array<SearchResult<ArtisanSearchRecord>>
  total: number
  hasMore: boolean
  query: string
  onItemClick?: (id: string, type: "artisan") => void
  activeItemId?: string | null
}

type InterventionSectionProps = {
  type: "intervention"
  items: Array<SearchResult<InterventionSearchRecord>>
  total: number
  hasMore: boolean
  query: string
  onItemClick?: (id: string, type: "intervention") => void
  activeItemId?: string | null
}

export type SearchSectionProps = ArtisanSectionProps | InterventionSectionProps

export function SearchSection(props: SearchSectionProps) {
  const { type, items, total, hasMore, query, onItemClick, activeItemId } = props
  const meta = SECTION_META[type]
  const Icon = meta.icon

  const extraCount = hasMore ? Math.max(total - items.length, 0) : 0

  return (
    <div className="border-b last:border-b-0">
      <div className="flex items-center justify-between bg-muted/30 px-4 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span>{meta.label}</span>
        </div>
        <Badge variant="outline" className="text-[11px] font-medium">
          {total} résultat{total > 1 ? "s" : ""}
        </Badge>
      </div>

      <div>
        {items.length > 0 ? (
          items.map((result) => {
            const matchLabel = getMatchLabel(result.matchedFields[0])
            const isActive = activeItemId === result.data.id
            if (type === "artisan") {
              return (
                <ArtisanResultItem
                  key={result.data.id}
                  result={result as SearchResult<ArtisanSearchRecord>}
                  query={query}
                  matchLabel={matchLabel}
                  onClick={onItemClick ? () => onItemClick(result.data.id, "artisan") : undefined}
                  isActive={isActive}
                />
              )
            }
            return (
              <InterventionResultItem
                key={result.data.id}
                result={result as SearchResult<InterventionSearchRecord>}
                query={query}
                matchLabel={matchLabel}
                onClick={onItemClick ? () => onItemClick(result.data.id, "intervention") : undefined}
                isActive={isActive}
              />
            )
          })
        ) : (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
            Aucun résultat dans cette catégorie
          </div>
        )}
      </div>

      {extraCount > 0 ? (
        <div className="px-4 py-2 text-xs text-muted-foreground">
          + {extraCount} {type === "artisan" ? "artisan" : "intervention"}
          {extraCount > 1 ? "s" : ""} supplémentaire{extraCount > 1 ? "s" : ""}
        </div>
      ) : null}
    </div>
  )
}

