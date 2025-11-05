"use client"

import { motion } from "framer-motion"
import { FileText, MessageSquare, Receipt, ShieldCheck, Trash2, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { WorkflowStatus } from "@/types/intervention-workflow"
import type { LucideIcon } from "lucide-react"

const requirementIcons: {
  key: keyof WorkflowStatus["metadata"]
  icon: LucideIcon
  label: string
}[] = [
  { key: "requiresArtisan", icon: Users, label: "Artisan requis" },
  { key: "requiresFacture", icon: Receipt, label: "Facture requise" },
  { key: "requiresProprietaire", icon: ShieldCheck, label: "Propriétaire requis" },
  { key: "requiresCommentaire", icon: MessageSquare, label: "Commentaire requis" },
  { key: "requiresDevisId", icon: FileText, label: "ID devis requis" },
]

type StatusNodeProps = {
  status: WorkflowStatus
  isSelected?: boolean
  onClick?: () => void
  onRemove?: (statusId: string) => void
}

export function StatusNode({ status, isSelected = false, onClick, onRemove }: StatusNodeProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        className={cn(
          "relative min-w-[140px] cursor-pointer rounded-lg border-2 bg-background p-3 shadow-sm transition",
          isSelected ? "border-primary shadow-lg" : "border-border hover:border-primary/40",
        )}
      >
        <div className="absolute right-2 top-2 flex gap-1">
          {onRemove ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={(event) => {
                    event.stopPropagation()
                    onRemove(status.id)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Supprimer le statut</TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <div className="h-2 w-12 rounded-full" style={{ backgroundColor: status.color }} />
          <div className="flex-1">
            <p className="text-sm font-semibold leading-tight">{status.label}</p>
            {status.description ? (
              <p className="text-xs text-muted-foreground line-clamp-2">{status.description}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1 text-muted-foreground">
          {requirementIcons.map(({ key, icon: Icon, label }) => {
            if (!status.metadata?.[key]) return null
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">{label}</TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        {status.isInitial ? (
          <Badge className="absolute -top-2 -right-2" variant="secondary">
            Initial
          </Badge>
        ) : null}
        {status.isTerminal ? (
          <Badge className="absolute -bottom-2 -right-2" variant="secondary">
            Terminal
          </Badge>
        ) : null}
      </motion.div>
    </TooltipProvider>
  )
}

export default StatusNode
