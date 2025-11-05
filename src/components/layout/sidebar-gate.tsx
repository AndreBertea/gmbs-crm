"use client"

import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/layout/app-sidebar"

export default function SidebarGate({ isAuthed }: { isAuthed: boolean }) {
  const pathname = usePathname()
  // Hide sidebar on the login page
  const hideOnLogin = pathname === "/login"
  // Requirement: sidebar should be hidden ONLY on /login
  const show = !hideOnLogin
  return show ? <AppSidebar /> : null
}
