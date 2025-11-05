import type React from "react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Minimal segment layout: root layout still wraps with providers; no sidebar here
  return <>{children}</>
}
