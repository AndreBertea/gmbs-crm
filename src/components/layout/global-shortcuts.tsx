"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

const ROUTE_CYCLE = [
  "/dashboard",
  "/interventions",
  "/artisans",
  "/settings",
]

export default function GlobalShortcuts() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement
      const isEditable = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable
      if (isEditable) return
      e.preventDefault()
      const current = ROUTE_CYCLE.findIndex((r) => pathname?.startsWith(r))
      const next = (current + 1) % ROUTE_CYCLE.length
      router.push(ROUTE_CYCLE[next])
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [pathname, router])

  return null
}
