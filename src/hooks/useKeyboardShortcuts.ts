"use client"
import { useEffect } from "react"

export function useKeyboardShortcuts(opts: {
  onFocusSearch: () => void
  onClearSearch: () => void
  onSelectAll: () => void
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      // Check if a modal or dialog is open before handling shortcuts
      const hasOpenModal = document.querySelector('[role="dialog"], [role="alertdialog"]')
      const hasOpenMenu = document.querySelector('[role="menu"]')
      
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !hasOpenModal && !hasOpenMenu) { 
        e.preventDefault(); 
        opts.onFocusSearch() 
      }
      // Only clear search if no modal is open (modals handle their own Escape)
      if (e.key === "Escape" && !hasOpenModal && !hasOpenMenu) { 
        opts.onClearSearch() 
      }
      if ((e.key === "a" || e.key === "A") && (e.metaKey || e.ctrlKey) && !hasOpenModal) { 
        e.preventDefault(); 
        opts.onSelectAll() 
      }
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [opts])
}
