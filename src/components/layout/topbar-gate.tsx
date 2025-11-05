"use client"

import { usePathname } from "next/navigation"
import Topbar from "@/components/layout/topbar"

export default function TopbarGate() {
  const pathname = usePathname()
  const hideOnLogin = pathname === "/login"
  return hideOnLogin ? null : <Topbar />
}

