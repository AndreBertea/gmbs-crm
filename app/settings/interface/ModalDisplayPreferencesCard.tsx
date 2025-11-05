"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ModeIcons } from "@/components/ui/mode-selector/ModeIcons"
import { useModalDisplay } from "@/contexts/ModalDisplayContext"
import type { ModalDisplayMode } from "@/types/modal-display"

const OPTIONS: Array<{ id: ModalDisplayMode; label: string; description: string }> = [
  { id: "halfpage", label: "Aperçu latéral", description: "Ouvre la fiche sur la moitié droite" },
  { id: "centerpage", label: "Aperçu centré", description: "Affiche la fiche au centre de l'écran" },
  { id: "fullpage", label: "Pleine page", description: "Utilise toute la surface disponible" },
]

export function ModalDisplayPreferencesCard() {
  const { defaultMode, setDefaultMode, resetToDefault, isDefaultModeModified } = useModalDisplay()
  const activeOption = useMemo(() => OPTIONS.find((option) => option.id === defaultMode) ?? OPTIONS[0], [defaultMode])
  const ActiveIcon = ModeIcons[activeOption.id]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Préférences d'affichage des interventions</CardTitle>
        <CardDescription>
          Choisissez le mode d'ouverture appliqué par défaut lorsque vous consultez une intervention.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Mode d'ouverture par défaut</Label>
          <Select value={defaultMode} onValueChange={(mode) => setDefaultMode(mode as ModalDisplayMode)}>
            <SelectTrigger className="w-full md:w-80">
              <SelectValue placeholder="Sélectionner un mode" />
            </SelectTrigger>
            <SelectContent>
              {OPTIONS.map((option) => {
                const Icon = ModeIcons[option.id]
                return (
                  <SelectItem key={option.id} value={option.id}>
                    <div className="flex items-center gap-3">
                      <Icon />
                      <div className="text-left">
                        <p className="text-sm font-medium leading-none">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">Détermine le mode utilisé par défaut quand vous ouvrez une intervention.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Mode actuel :</span>
            <div className="flex items-center gap-2">
              <ActiveIcon />
              <span>{activeOption.label}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={resetToDefault} disabled={!isDefaultModeModified}>
            Réinitialiser
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default ModalDisplayPreferencesCard
