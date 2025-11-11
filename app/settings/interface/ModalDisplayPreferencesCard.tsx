"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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

  const handleModeChange = (mode: string) => {
    setDefaultMode(mode as ModalDisplayMode)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Préférences d&apos;affichage des Modals</CardTitle>
        <CardDescription>
          Choisissez le mode d&apos;ouverture appliqué par défaut lorsque vous consultez une intervention.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label className="text-base font-medium">Mode d&apos;ouverture par défaut</Label>
          <RadioGroup
            value={defaultMode}
            onValueChange={handleModeChange}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Halfpage - Aperçu latéral */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="halfpage" id="halfpage" />
                  <Label htmlFor="halfpage" className="font-medium">
                    Aperçu latéral
                  </Label>
                </div>
                <div
                  className="border rounded-lg p-4 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer relative overflow-hidden"
                  onClick={() => handleModeChange("halfpage")}
                >
                  {/* Simulation de l'écran */}
                  <div className="relative bg-background border rounded h-32 flex gap-2 p-2">
                    {/* Contenu principal (gauche) */}
                    <div className="flex-1 flex flex-col gap-1.5 p-2">
                      <div className="w-full h-1.5 bg-muted-foreground/20 rounded"></div>
                      <div className="w-3/4 h-1.5 bg-muted-foreground/20 rounded"></div>
                      <div className="w-full h-1.5 bg-muted-foreground/20 rounded"></div>
                      <div className="w-2/3 h-1.5 bg-muted-foreground/20 rounded"></div>
                    </div>
                    {/* Modal qui apparaît depuis la droite */}
                    <div className="w-1/2 bg-primary/10 border-l-2 border-primary rounded-r animate-[slide-in-right_3s_ease-in-out_infinite] flex flex-col gap-1.5 p-2">
                      <div className="w-full h-1.5 bg-primary/30 rounded"></div>
                      <div className="w-4/5 h-1.5 bg-primary/30 rounded"></div>
                      <div className="w-full h-1 bg-primary/20 rounded"></div>
                      <div className="flex-1 bg-primary/5 rounded mt-1"></div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Ouvre la fiche sur la moitié droite</p>
              </div>

              {/* Centerpage - Aperçu centré */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="centerpage" id="centerpage" />
                  <Label htmlFor="centerpage" className="font-medium">
                    Aperçu centré
                  </Label>
                </div>
                <div
                  className="border rounded-lg p-4 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer relative overflow-hidden"
                  onClick={() => handleModeChange("centerpage")}
                >
                  {/* Simulation de l'écran */}
                  <div className="relative bg-background border rounded h-32 flex items-center justify-center p-2">
                    {/* Overlay sombre en arrière-plan */}
                    <div className="absolute inset-0 bg-black/20 animate-[fade-in_3s_ease-in-out_infinite]"></div>
                    {/* Modal centré */}
                    <div className="relative w-3/5 h-3/4 bg-primary/10 border-2 border-primary rounded-lg shadow-lg animate-[scale-in_3s_ease-in-out_infinite] flex flex-col gap-1.5 p-2 z-10">
                      <div className="w-full h-1.5 bg-primary/30 rounded"></div>
                      <div className="w-4/5 h-1.5 bg-primary/30 rounded"></div>
                      <div className="w-full h-1 bg-primary/20 rounded"></div>
                      <div className="flex-1 bg-primary/5 rounded mt-1"></div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Affiche la fiche au centre de l&apos;écran</p>
              </div>

              {/* Fullpage - Pleine page */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fullpage" id="fullpage" />
                  <Label htmlFor="fullpage" className="font-medium">
                    Pleine page
                  </Label>
                </div>
                <div
                  className="border rounded-lg p-4 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer relative overflow-hidden"
                  onClick={() => handleModeChange("fullpage")}
                >
                  {/* Simulation de l'écran */}
                  <div className="relative bg-background border rounded h-32 p-2">
                    {/* Modal plein écran */}
                    <div className="absolute inset-0 bg-primary/10 border-2 border-primary rounded animate-[fullscreen-expand_3s_ease-in-out_infinite] flex flex-col gap-1.5 p-3">
                      <div className="w-full h-2 bg-primary/30 rounded"></div>
                      <div className="w-4/5 h-1.5 bg-primary/30 rounded"></div>
                      <div className="w-full h-1 bg-primary/20 rounded"></div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="h-8 bg-primary/5 rounded"></div>
                        <div className="h-8 bg-primary/5 rounded"></div>
                      </div>
                      <div className="flex-1 bg-primary/5 rounded mt-1"></div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Utilise toute la surface disponible</p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
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
