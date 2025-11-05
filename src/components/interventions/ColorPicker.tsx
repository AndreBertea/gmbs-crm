"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const PREDEFINED_COLORS = [
  "#3B82F6",
  "#6366F1",
  "#14B8A6",
  "#F97316",
  "#10B981",
  "#A855F7",
  "#0EA5E9",
  "#F59E0B",
  "#EC4899",
  "#64748B",
  "#EF4444",
  "#22C55E",
  "#8B5CF6",
  "#06B6D4",
  "#FBBF24",
]

type ColorPickerProps = {
  value: string
  onChange: (color: string) => void
  label?: string
}

export function ColorPicker({ value, onChange, label = "Couleur" }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(value)

  const applyCustomColor = () => {
    const hexPattern = /^#[0-9A-F]{6}$/i
    if (hexPattern.test(customColor)) {
      onChange(customColor)
    }
  }

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {PREDEFINED_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={cn(
              "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
              value === color ? "border-primary ring-2 ring-primary/20" : "border-border",
            )}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <span className="inline-flex h-4 w-4 rounded-full border" style={{ backgroundColor: value }} />
              Couleur personnalisée
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 space-y-3">
            <div className="space-y-2">
              <Label>Couleur hexadécimale</Label>
              <div className="flex gap-2">
                <Input
                  value={customColor}
                  onChange={(event) => setCustomColor(event.target.value)}
                  placeholder="#3B82F6"
                  className="font-mono"
                />
                <Button size="sm" onClick={applyCustomColor}>
                  Appliquer
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 100 }, (_, index) => {
                const hue = (index * 3.6) % 360
                const saturation = 70
                const lightness = 40 + Math.floor(index / 10) * 5
                const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`
                return (
                  <button
                    key={index}
                    type="button"
                    className="h-6 w-6 rounded border transition-transform hover:scale-125"
                    style={{ backgroundColor: color }}
                    onClick={() => onChange(color)}
                  />
                )
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

export default ColorPicker
