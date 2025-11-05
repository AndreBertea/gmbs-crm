"use client"

import { useCallback, useEffect } from "react"
import { GenericModal } from "@/components/ui/modal"
import { useModalDisplay } from "@/contexts/ModalDisplayContext"
import { useModalState } from "@/hooks/useModalState"
import type { ModalContent } from "@/types/modal"
import type { ModalDisplayMode } from "@/types/modal-display"
import { InterventionModalContent } from "./InterventionModalContent"
import { NewInterventionModalContent } from "./NewInterventionModalContent"

const MODE_SEQUENCE: ModalDisplayMode[] = ["halfpage", "centerpage", "fullpage"]

type Props = {
  interventionId: string | null
  isOpen: boolean
  onClose: () => void
  onNext?: () => void
  onPrevious?: () => void
  canNext?: boolean
  canPrevious?: boolean
  activeIndex?: number
  totalCount?: number
  content?: ModalContent | null
}

export function InterventionModal({
  interventionId,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  canNext,
  canPrevious,
  activeIndex,
  totalCount,
  content,
}: Props) {
  const { effectiveMode, setPreferredMode } = useModalDisplay()
  const setSourceLayoutId = useModalState((state) => state.setSourceLayoutId)
  const setOverrideMode = useModalState((state) => state.setOverrideMode)
  const sourceLayoutId = useModalState((state) => state.sourceLayoutId)

  useEffect(() => {
    return () => {
      setSourceLayoutId(null)
      setOverrideMode(null)
    }
  }, [setOverrideMode, setSourceLayoutId])

  const cycleMode = useCallback(() => {
    const currentIndex = MODE_SEQUENCE.indexOf(effectiveMode)
    const nextMode = MODE_SEQUENCE[(currentIndex + 1) % MODE_SEQUENCE.length]
    setOverrideMode(null)
    setPreferredMode(nextMode)
  }, [effectiveMode, setOverrideMode, setPreferredMode])

  const currentContent: ModalContent = content ?? "intervention"

  const renderedContent = (() => {
    if (currentContent === "new-intervention") {
      return <NewInterventionModalContent mode={effectiveMode} onClose={onClose} onCycleMode={cycleMode} />
    }

    if (currentContent !== "intervention") {
      return null
    }

    if (!interventionId) {
      return null
    }

    return (
      <InterventionModalContent
        key={interventionId}
        interventionId={interventionId}
        mode={effectiveMode}
        onClose={onClose}
        onNext={onNext}
        onPrevious={onPrevious}
        canNext={canNext}
        canPrevious={canPrevious}
        onCycleMode={cycleMode}
        activeIndex={activeIndex}
        totalCount={totalCount}
      />
    )
  })()

  if (!renderedContent) {
    return null
  }

  return (
    <GenericModal
      isOpen={isOpen}
      onClose={onClose}
      mode={effectiveMode}
      layoutId={sourceLayoutId ?? undefined}
    >
      {renderedContent}
    </GenericModal>
  )
}

export default InterventionModal
