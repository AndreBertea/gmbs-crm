"use client"

import { useCallback, useEffect } from "react"

import ColumnConfiguration from "./ColumnConfiguration"
import { GenericModal } from "@/components/ui/modal"
import { useModalDisplay } from "@/contexts/ModalDisplayContext"
import type { ModalDisplayMode } from "@/types/modal-display"
import type { InterventionViewDefinition, TableLayoutOptions } from "@/types/intervention-views"

type ColumnConfigurationModalProps = {
  view: InterventionViewDefinition | null
  onUpdateColumns: (viewId: string, visibleProperties: string[]) => void
  onUpdateLayoutOptions?: (viewId: string, patch: Partial<TableLayoutOptions>) => void
  onClose: () => void
}

const MODE_SEQUENCE: ModalDisplayMode[] = ["halfpage", "centerpage", "fullpage"]

export function ColumnConfigurationModal({ view, onUpdateColumns, onUpdateLayoutOptions, onClose }: ColumnConfigurationModalProps) {
  const { effectiveMode, setPreferredMode } = useModalDisplay()

  const cycleMode = useCallback(() => {
    const currentIndex = MODE_SEQUENCE.indexOf(effectiveMode)
    const nextMode = MODE_SEQUENCE[(currentIndex + 1) % MODE_SEQUENCE.length]
    setPreferredMode(nextMode)
  }, [effectiveMode, setPreferredMode])

  // Handle Escape key and browser back button
  useEffect(() => {
    if (!view) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
      }
    }

    const handlePopState = () => {
      onClose()
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("popstate", handlePopState)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("popstate", handlePopState)
    }
  }, [view, onClose])

  if (!view) return null

  return (
    <GenericModal isOpen={Boolean(view)} onClose={onClose} mode={effectiveMode}>
      <ColumnConfiguration
        view={view}
        mode={effectiveMode}
        onClose={onClose}
        onCycleMode={cycleMode}
        onUpdateColumns={(visible) => {
          onUpdateColumns(view.id, visible)
        }}
        onUpdateColumnOrder={(visible) => {
          onUpdateColumns(view.id, visible)
        }}
        onUpdateLayoutOptions={(patch) => {
          onUpdateLayoutOptions?.(view.id, patch)
        }}
      />
    </GenericModal>
  )
}

export default ColumnConfigurationModal
