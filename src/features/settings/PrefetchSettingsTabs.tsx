"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

const ROUTES = [
  "/settings/profile",
  "/settings/interface",
  "/settings/team",
  "/settings/security",
]

export default function PrefetchSettingsTabs() {
  const router = useRouter()
  useEffect(() => {
    const run = () => ROUTES.forEach((r) => router.prefetch(r))
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = (window as any).requestIdleCallback(run)
      return () => (window as any).cancelIdleCallback?.(id)
    }
    const id = setTimeout(run, 150)
    return () => clearTimeout(id)
  }, [router])
  return null
}
