"use client"

import * as React from "react"
import { useSettings } from "@/stores/settings"

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useSettings((s) => s.hydrate)
  const theme = useSettings((s) => s.theme)
  const classEffect = useSettings((s) => s.classEffect)

  // Hydrate from localStorage on mount
  React.useEffect(() => {
    try {
      hydrate()
    } catch {}
  }, [hydrate])

  // Persist on change
  React.useEffect(() => {
    const unsub = useSettings.subscribe((state) => {
      try {
        const persist = {
          sidebarMode: state.sidebarMode,
          theme: state.theme,
          classEffect: state.classEffect,
          statusMock: state.statusMock,
        }
        localStorage.setItem("gmbs:settings", JSON.stringify(persist))
      } catch {}
    })
    return () => unsub()
  }, [])

  // Apply theme/class effect to <html>
  React.useEffect(() => {
    const apply = () => {
      if (typeof document === "undefined") return
      const root = document.documentElement
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      const darkActive = theme === "dark" || (theme === "system" && prefersDark)
      const resolved = classEffect && darkActive ? "dark" : "light"
      if (resolved === "dark") root.classList.add("dark")
      else root.classList.remove("dark")
      root.setAttribute("data-theme", resolved)
    }
    apply()
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => apply()
    mq.addEventListener?.("change", handler)
    return () => mq.removeEventListener?.("change", handler)
  }, [theme, classEffect])

  return <>{children}</>
}
