"use client"

import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { useInterface } from "@/contexts/interface-context"

export default function SidebarGate({ isAuthed }: { isAuthed: boolean }) {
  const pathname = usePathname()
  const { sidebarEnabled } = useInterface()
  // Hide sidebar on the login page
  const hideOnLogin = pathname === "/login"
  // Requirement: sidebar should be hidden ONLY on /login
  const show = !hideOnLogin && sidebarEnabled
  return show ? <AppSidebar /> : null
}
