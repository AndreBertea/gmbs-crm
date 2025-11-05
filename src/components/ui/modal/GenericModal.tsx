"use client"

import { type ReactNode, useMemo } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion, type Variants } from "framer-motion"
import type { ModalDisplayMode } from "@/types/modal-display"
import { cn } from "@/lib/utils"

type Props = {
  isOpen: boolean
  onClose: () => void
  mode: ModalDisplayMode
  layoutId?: string | null
  children: ReactNode
  containerClassName?: string
  wrapperClassName?: string
  contentClassName?: string
}

const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

const containerVariants: Record<ModalDisplayMode, Variants> = {
  halfpage: {
    initial: { x: "100%" },
    animate: { x: "0%" },
    exit: { x: "100%" },
  },
  centerpage: {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
  },
  fullpage: {
    initial: { y: "100%" },
    animate: { y: "0%" },
    exit: { y: "100%" },
  },
}

const getModalStyle = (mode: ModalDisplayMode) => {
  switch (mode) {
    case "halfpage":
      return {
        container: "fixed top-0 right-0 z-[70] h-full w-1/2 p-4",
        wrapper: "pointer-events-none h-full w-full",
        content: "pointer-events-auto flex h-full w-full flex-col overflow-hidden shadcn-sheet-content",
      }
    case "centerpage":
      return {
        container: "fixed inset-0 z-[70] flex items-center justify-center p-4",
        wrapper: "pointer-events-none flex h-full w-full items-center justify-center",
        content:
          "pointer-events-auto modal-surface flex h-[85vh] w-full max-w-[80vw] flex-col overflow-hidden p-0",
      }
    case "fullpage":
      return {
        container: "fixed inset-0 z-[9999] flex bg-background",
        wrapper: "h-full w-full",
        content: "pointer-events-auto modal-surface-full flex h-full w-full flex-col overflow-y-auto",
      }
  }
}

export function GenericModal({
  isOpen,
  onClose,
  mode,
  layoutId,
  children,
  containerClassName,
  wrapperClassName,
  contentClassName,
}: Props) {
  // Event handlers (Escape key, popstate) are managed by the parent component
  // or by hooks like useInterventionModal to avoid duplication

  const showBackdrop = mode === "centerpage"

  const transition = useMemo(
    () => ({
      type: "spring" as const,
      damping: 25,
      stiffness: 300,
    }),
    [],
  )

  const modalStyle = getModalStyle(mode)

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen ? (
        <>
          {showBackdrop && (
            <motion.div
              role="presentation"
              aria-hidden
              className="modal-overlay z-[60]"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={backdropVariants}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
          )}
          <motion.div
            key="modal-container"
            className={cn(modalStyle.container, containerClassName)}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={containerVariants[mode]}
            transition={transition}
            layout
            layoutId={layoutId ?? undefined}
            role="dialog"
            aria-modal="true"
          >
            <div className={cn(modalStyle.wrapper, wrapperClassName)}>
              <div className={cn(modalStyle.content, contentClassName)}>
                {children}
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )

  if (mode === "fullpage" && typeof window !== "undefined") {
    return createPortal(modalContent, document.body)
  }

  return modalContent
}

export default GenericModal
