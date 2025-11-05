"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "interface", label: "Interface" },
  { key: "team", label: "Team" },
  { key: "security", label: "Security" },
]

export default function SettingsNav() {
  const pathname = usePathname()
  const router = useRouter()
  const active = pathname?.split("/")[2] ?? "profile"

  useEffect(() => {
    const run = () => TABS.forEach((t) => router.prefetch(`/settings/${t.key}`))
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = (window as any).requestIdleCallback(run)
      return () => (window as any).cancelIdleCallback?.(id)
    }
    const id = setTimeout(run, 150)
    return () => clearTimeout(id)
  }, [router])

  return (
    <Tabs value={active} className="mt-4">
      <TabsList className="grid grid-cols-2 sm:grid-cols-4">
        {TABS.map((t) => (
          <TabsTrigger key={t.key} value={t.key} asChild>
            <Link
              href={`/settings/${t.key}`}
              prefetch
              aria-current={active === t.key ? "page" : undefined}
              onMouseEnter={() => router.prefetch(`/settings/${t.key}`)}
            >
              {t.label}
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
