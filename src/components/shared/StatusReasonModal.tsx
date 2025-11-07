"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { StatusReasonType } from "@/lib/comments/statusReason"

interface StatusReasonModalProps {
  open: boolean
  type: StatusReasonType
  onConfirm: (reason: string) => void
  onCancel: () => void
  isSubmitting?: boolean
}

const MODAL_COPY: Record<StatusReasonType, {
  title: string
  description: string
  label: string
  placeholder: string
  badge: string
}> = {
  archive: {
    title: "Motif d'archivage requis",
    description: "Merci d'expliquer pourquoi ce dossier est archivé. L'information sera visible dans l'historique.",
    label: "Motif d'archivage",
    placeholder: "Ex: Intervention clôturée, artisan inactif, doublon...",
    badge: "archivage",
  },
  done: {
    title: "Retour obligatoire",
    description: "Partagez brièvement comment s'est déroulée l'intervention afin d'en garder une trace.",
    label: "Comment s'est déroulée l'intervention ?",
    placeholder: "Ex: Intervention terminée sans réserve, SAV prévu, client satisfait...",
    badge: "terminé",
  },
}

export function StatusReasonModal({ open, type, onConfirm, onCancel, isSubmitting }: StatusReasonModalProps) {
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (!open) {
      setReason("")
    }
  }, [open])

  const trimmedReason = reason.trim()
  const copy = MODAL_COPY[type]

  const handleConfirm = () => {
    if (!trimmedReason || isSubmitting) {
      return
    }
    onConfirm(trimmedReason)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) {
        onCancel()
      }
    }}>
      <DialogContent className="sm:max-w-md !z-[1300]" overlayClassName="!z-[1200]">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span>{copy.label}</span>
            <Badge variant={type === "archive" ? "secondary" : "default"} className="uppercase tracking-wide text-[11px]">
              {copy.badge}
            </Badge>
          </div>
          <Textarea
            autoFocus
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={copy.placeholder}
            disabled={isSubmitting}
            required
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!trimmedReason || isSubmitting}>
            Valider le commentaire
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
