import type React from "react"
import { ModalDisplayProvider } from "@/contexts/ModalDisplayContext"

type Props = {
  children: React.ReactNode
}

export default function InterventionsLayout({ children }: Props) {
  return <ModalDisplayProvider>{children}</ModalDisplayProvider>
}