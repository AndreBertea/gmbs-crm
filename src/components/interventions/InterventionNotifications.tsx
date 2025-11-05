"use client"

import { Bell, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useInterventionReminders } from "@/hooks/useInterventionReminders"
import type { InterventionView } from "@/types/intervention-view"
import { cn } from "@/lib/utils"

type InterventionNotificationsProps = {
  interventions?: InterventionView[]
  onInterventionClick?: (id: string) => void
}

export function InterventionNotifications({
  interventions = [],
  onInterventionClick,
}: InterventionNotificationsProps) {
  const { reminders, count, removeReminder } = useInterventionReminders()

  // Filtrer les interventions qui ont un reminder
  const reminderInterventions = interventions.filter((intervention) =>
    reminders.has(intervention.id)
  )

  const handleInterventionClick = (id: string) => {
    onInterventionClick?.(id)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-semibold">
            Rappels {count > 0 && `(${count})`}
          </span>
        </div>
        <DropdownMenuSeparator />
        {count === 0 ? (
          <div className="px-2 py-8 text-center text-sm text-muted-foreground">
            Aucun rappel pour le moment
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1 px-1 py-1">
              {reminderInterventions.map((intervention) => {
                const idInter = (intervention as any).id_inter || intervention.id
                const contexte = (intervention as any).contexteIntervention || "—"
                const statusLabel = (intervention as any).statusLabel || "—"
                
                return (
                  <div
                    key={intervention.id}
                    className="group flex items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {idInter}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {statusLabel}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {contexte}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleInterventionClick(intervention.id)}
                        title="Voir les détails"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => void removeReminder(intervention.id)}
                        title="Retirer le rappel"
                      >
                        <Bell className="h-3.5 w-3.5 fill-current" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
