"use client"

import { usePathname } from "next/navigation"

export function ConditionalPadding({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"
  
  return (
    <div className={`flex flex-1 w-full overflow-hidden ${isLoginPage ? '' : 'pt-16'}`}>
      {children}
    </div>
  )
}


