"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type ArtisanDossierStatus =
  | "complet"
  | "en_attente"
  | "incomplet"
  | "a_verifier"
  | "bloque"
  | string

const STATUS_THEME: Record<string, { bg: string; dot: string; label: string }> = {
  complet: { bg: "bg-emerald-100", dot: "bg-emerald-500", label: "Complet" },
  en_attente: { bg: "bg-amber-100", dot: "bg-amber-500", label: "En attente" },
  incomplet: { bg: "bg-red-100", dot: "bg-red-500", label: "Incomplet" },
  a_verifier: { bg: "bg-blue-100", dot: "bg-blue-500", label: "À vérifier" },
  bloque: { bg: "bg-gray-200", dot: "bg-gray-500", label: "Bloqué" },
}

export interface ArtisanDossierStatusIconProps {
  status?: ArtisanDossierStatus
  size?: "sm" | "md"
  className?: string
}

export function ArtisanDossierStatusIcon({ status, size = "md", className }: ArtisanDossierStatusIconProps) {
  if (!status) return null
  const slug = status.toLowerCase().replace(/\s+/g, "_")
  const theme = STATUS_THEME[slug] ?? { bg: "bg-gray-200", dot: "bg-gray-600", label: status }
  const dimension = size === "sm" ? "h-5" : "h-6"
  const dotSize = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 text-xs font-medium text-foreground/80",
        theme.bg,
        className,
      )}
      title={theme.label}
    >
      <span className={cn("inline-flex items-center justify-center", dimension)}>
        <span className={cn("rounded-full", dotSize, theme.dot)} />
      </span>
      {theme.label}
    </span>
  )
}
