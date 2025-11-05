"use client"

import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

type Props = {
  children: ReactNode
  className?: string
}

export function GenericModalContent({ children, className }: Props) {
  return <div className={cn("h-full w-full", className)}>{children}</div>
}

export default GenericModalContent
