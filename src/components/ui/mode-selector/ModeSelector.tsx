"use client"

import { memo } from "react"
import { useRouter } from "next/navigation"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useModalDisplay } from "@/contexts/ModalDisplayContext"
import { ModeIcons } from "./ModeIcons"
import type { ModalDisplayMode } from "@/types/modal-display"

export const MODE_OPTIONS: Array<{
  mode: ModalDisplayMode
  label: string
  description: string
}> = [
  {
    mode: "halfpage",
    label: "Aperçu latéral",
    description: "Ouvre la fiche sur la moitié droite",
  },
  {
    mode: "centerpage", 
    label: "Aperçu centré",
    description: "Affiche la fiche au centre de l'écran",
  },
  {
    mode: "fullpage",
    label: "Pleine page", 
    description: "Utilise toute la surface disponible",
  },
]

export const ModeSelector = memo(() => {
  const router = useRouter()
  const { preferredMode, setPreferredMode } = useModalDisplay()
  
  const currentMode = MODE_OPTIONS.find((option) => option.mode === preferredMode) ?? MODE_OPTIONS[0]
  const CurrentIcon = ModeIcons[currentMode.mode]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="inline-flex items-center gap-2">
          <CurrentIcon />
          {currentMode.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {MODE_OPTIONS.map((option) => {
          const Icon = ModeIcons[option.mode]
          const isActive = preferredMode === option.mode
          return (
            <DropdownMenuItem
              key={option.mode}
              onSelect={() => setPreferredMode(option.mode)}
              className={isActive ? "bg-muted" : undefined}
            >
              <div className="flex items-start gap-3">
                <Icon />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium leading-none">{option.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                </div>
              </div>
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/settings/interface")}>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Modifier la vue par défaut</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})

ModeSelector.displayName = "ModeSelector"
