"use client"

import { forwardRef } from "react"
import type { ReactNode, UIEvent } from "react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type ScrollableTableCardProps = {
  children: ReactNode
  footer?: ReactNode
  height?: string
  className?: string
  onScroll?: (event: UIEvent<HTMLDivElement>) => void
}

/**
 * Layout container that provides a scrollable area with an optional sticky footer.
 * Keeps layout concerns out of the table implementation.
 */
export const ScrollableTableCard = forwardRef<HTMLDivElement, ScrollableTableCardProps>(
  ({ children, footer, height, className, onScroll }, ref) => {
    const targetHeight = height ?? "calc(100vh - 200px)"

    return (
      <Card className={cn("flex h-full flex-col", className)}>
        <div
          ref={ref}
          className="relative flex-1 overflow-auto min-h-0"
          style={{
            height: targetHeight,
            maxHeight: targetHeight,
            minHeight: "320px",
          }}
          onScroll={onScroll}
        >
          {children}
        </div>

        {footer ? <footer className="flex-shrink-0 border-t bg-muted/30 p-3">{footer}</footer> : null}
      </Card>
    )
  },
)

ScrollableTableCard.displayName = "ScrollableTableCard"

export default ScrollableTableCard
