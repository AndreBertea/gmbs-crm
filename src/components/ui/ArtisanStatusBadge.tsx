"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type ArtisanStatus =
  | "prospect"
  | "en_controle"
  | "qualifie"
  | "a_recontacter"
  | "inactif"
  | "blacklist"
  | string

const STATUS_STYLES: Record<string, string> = {
  prospect: "bg-blue-100 text-blue-700 border border-blue-200",
  en_controle: "bg-purple-100 text-purple-700 border border-purple-200",
  qualifie: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  a_recontacter: "bg-amber-100 text-amber-700 border border-amber-200",
  inactif: "bg-gray-200 text-gray-700 border border-gray-300",
  blacklist: "bg-red-100 text-red-700 border border-red-200",
}

export interface ArtisanStatusBadgeProps {
  status?: ArtisanStatus
  size?: "sm" | "md"
  className?: string
}

export function ArtisanStatusBadge({ status, size = "md", className }: ArtisanStatusBadgeProps) {
  if (!status) return null
  const slug = status.toLowerCase().replace(/\s+/g, "_")
  const base = STATUS_STYLES[slug] ?? "bg-gray-100 text-gray-700 border border-gray-200"
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-0.5",
        base,
        className,
      )}
    >
      {status}
    </Badge>
  )
}
