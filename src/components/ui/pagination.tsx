"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
  onPageChange: (page: number) => void
  onNext?: () => void
  onPrevious?: () => void
  onPageSizeChange?: (pageSize: number) => void
  canGoNext?: boolean
  canGoPrevious?: boolean
  className?: string
  pageSizeOptions?: number[]
}

export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onNext,
  onPrevious,
  onPageSizeChange,
  canGoNext = true,
  canGoPrevious = true,
  className = "",
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps) {
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)

  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    onPageChange(newPage)
  }

  const handleChangeRowsPerPage = (newPageSize: string) => {
    const size = parseInt(newPageSize, 10)
    if (onPageSizeChange) {
      onPageSizeChange(size)
    }
    // Réinitialiser à la première page lors du changement de taille
    onPageChange(1)
  }

  return (
    <div className={cn("flex items-center justify-between px-2 py-1.5", className)}>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Lignes par page:
            </span>
            <Select value={String(pageSize)} onValueChange={handleChangeRowsPerPage}>
              <SelectTrigger className="h-8 w-[70px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {startItem}-{endItem} sur {totalCount}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            if (onPrevious) {
              onPrevious()
            } else {
              handleChangePage(null, Math.max(1, currentPage - 1))
            }
          }}
          disabled={!canGoPrevious || currentPage === 1}
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            if (onNext) {
              onNext()
            } else {
              handleChangePage(null, Math.min(totalPages, currentPage + 1))
            }
          }}
          disabled={!canGoNext || currentPage === totalPages}
          aria-label="Page suivante"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

