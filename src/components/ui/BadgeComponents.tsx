"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Tone = "gray" | "blue" | "green" | "purple" | "orange" | "red"

const TONE_CLASSES: Record<Tone, string> = {
  gray: "bg-gray-100 text-gray-700 border border-gray-200",
  blue: "bg-blue-100 text-blue-700 border border-blue-200",
  green: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  purple: "bg-purple-100 text-purple-700 border border-purple-200",
  orange: "bg-orange-100 text-orange-700 border border-orange-200",
  red: "bg-red-100 text-red-700 border border-red-200",
}

export interface StatusBadgeProps {
  label: string
  hint?: string
  tone?: Tone
  icon?: React.ReactNode
  size?: "sm" | "md"
  className?: string
}

export function StatusBadge({ label, hint, tone = "gray", icon, size = "md", className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs",
        TONE_CLASSES[tone],
        className,
      )}
      title={hint}
    >
      {icon}
      {label}
    </Badge>
  )
}

export type ArtisanMetier =
  | "plomberie"
  | "electricite"
  | "climatisation"
  | "menuiserie"
  | "peinture"
  | "chauffage"
  | "autre"
  | string

const METIER_TONE: Record<string, Tone> = {
  plomberie: "blue",
  electricite: "orange",
  climatisation: "purple",
  menuiserie: "green",
  peinture: "red",
  chauffage: "orange",
  autre: "gray",
}

export interface MetierBadgeProps {
  metier?: ArtisanMetier
  size?: "sm" | "md"
  className?: string
}

export function MetierBadge({ metier, size = "sm", className }: MetierBadgeProps) {
  if (!metier) return null
  const slug = metier.toLowerCase()
  const tone = METIER_TONE[slug] ?? "gray"
  return <StatusBadge label={metier} tone={tone} size={size} className={className} />
}

const AGENCE_TONE: Record<string, Tone> = {
  paris: "blue",
  lyon: "purple",
  marseille: "orange",
}

export interface AgenceBadgeProps {
  agence?: string
  size?: "sm" | "md"
  className?: string
}

export function AgenceBadge({ agence, size = "sm", className }: AgenceBadgeProps) {
  if (!agence) return null
  const tone = AGENCE_TONE[agence.toLowerCase()] ?? "gray"
  return <StatusBadge label={agence} tone={tone} size={size} className={className} />
}
