"use client"

import { useCallback } from "react"
import { cn } from "@/lib/utils"
import type { ArtisanViewDefinition } from "@/hooks/useArtisanViews"
import { Table } from "lucide-react"

type ArtisanViewTabsProps = {
  views: ArtisanViewDefinition[]
  activeViewId: string
  onSelect: (id: string) => void
  artisanCounts?: Record<string, number>
}

export function ArtisanViewTabs({
  views,
  activeViewId,
  onSelect,
  artisanCounts = {},
}: ArtisanViewTabsProps) {
  return (
    <div className="relative border-b border-border/60 pb-2">
      <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide h-11">
        {views.map((view) => {
          const isActive = view.id === activeViewId
          const count = artisanCounts[view.id] || 0
          
          return (
            <button
              key={view.id}
              type="button"
              onClick={() => onSelect(view.id)}
              className={cn(
                "relative flex items-center gap-2 rounded-full border border-transparent bg-muted/60 px-3 py-1.5 text-sm transition-colors hover:bg-muted",
                isActive && "border-primary/40 bg-primary/10 text-primary",
              )}
            >
              <Table className="h-4 w-4" />
              <span className="whitespace-nowrap">{view.title}</span>
              {count > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}


