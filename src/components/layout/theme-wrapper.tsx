"use client"

import * as React from "react"

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  return <div className="relative min-h-screen bg-background font-sans antialiased">{children}</div>
}
