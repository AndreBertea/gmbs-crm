"use client"

import React, { useCallback, useRef, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ModeIcons } from "@/components/ui/mode-selector"
import { LegacyInterventionForm } from "@/components/interventions/LegacyInterventionForm"
import type { ModalDisplayMode } from "@/types/modal-display"

type Props = {
  mode: ModalDisplayMode
  onClose: () => void
  onCycleMode?: () => void
}

export function NewInterventionModalContent({ mode, onClose, onCycleMode }: Props) {
  const handleSuccess = useCallback(
    (data: { id: string }) => {
      if (typeof window !== "undefined" && data?.id) {
        window.dispatchEvent(
          new CustomEvent("intervention-updated", {
            detail: {
              id: data.id,
              data,
            },
          }),
        )
      }
      onClose()
    },
    [onClose],
  )

  const ModeIcon = ModeIcons[mode]
  const bodyPadding = mode === "fullpage" ? "px-8 py-6 md:px-12" : "px-5 py-4 md:px-8"
  const surfaceVariantClass = mode === "fullpage" ? "modal-config-surface-full" : undefined
  const surfaceModeClass = `modal-config--${mode}`

  const formRef = useRef<HTMLFormElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = () => {
    if (formRef.current) {
      formRef.current.requestSubmit()
    }
  }

  return (
    <TooltipProvider>
      <div className={`modal-config-surface ${surfaceVariantClass} ${surfaceModeClass}`}>
        <header className="modal-config-columns-header">
          <div className="flex items-center gap-3">
            {onCycleMode ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="modal-config-columns-icon-button"
                    onClick={onCycleMode}
                    aria-label="Changer le mode d'affichage"
                  >
                    <ModeIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="modal-config-columns-tooltip">
                  Ajuster l&apos;affichage ({mode})
                </TooltipContent>
              </Tooltip>
            ) : (
              <span className="modal-config-columns-icon-placeholder" />
            )}
          </div>
          <div className="modal-config-columns-title">Créer une intervention</div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="modal-config-columns-icon-button"
                onClick={onClose}
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="modal-config-columns-tooltip">Fermer (Esc)</TooltipContent>
          </Tooltip>
        </header>
        
        <div className="modal-config-columns-body overflow-y-auto">
          <div className={bodyPadding}>
            <LegacyInterventionForm
              mode={mode}
              onSuccess={handleSuccess}
              onCancel={onClose}
              formRef={formRef}
              onSubmittingChange={setIsSubmitting}
            />
          </div>
        </div>
        
        <footer className="modal-config-columns-footer flex items-center justify-end">
          <div className="flex items-center gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="legacy-form-button"
            >
              Annuler
            </Button>
            <Button 
              type="button" 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="legacy-form-button bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isSubmitting ? "Création..." : "Créer l'intervention"}
            </Button>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}

export default NewInterventionModalContent
