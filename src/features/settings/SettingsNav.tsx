"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "interface", label: "Interface" },
  { key: "team", label: "Team" },
  { key: "security", label: "Security" },
]

export default function SettingsNav() {
  const pathname = usePathname()
  const router = useRouter()
  const active = pathname?.split("/")[2] ?? "profile"
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollYRef = useRef(0)
  const scrollContainerRef = useRef<HTMLElement | null>(null)
  const tickingRef = useRef(false)
  const scrollDirectionRef = useRef<'up' | 'down' | null>(null)

  useEffect(() => {
    const run = () => TABS.forEach((t) => router.prefetch(`/settings/${t.key}`))
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = (window as any).requestIdleCallback(run)
      return () => (window as any).cancelIdleCallback?.(id)
    }
    const id = setTimeout(run, 150)
    return () => clearTimeout(id)
  }, [router])

  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = scrollContainerRef.current
      if (!scrollContainer) return

      if (!tickingRef.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = scrollContainer.scrollTop
          const scrollDifference = Math.abs(currentScrollY - lastScrollYRef.current)
          
          // Seuil minimum de 5px pour éviter les micro-mouvements
          if (scrollDifference < 5) {
            tickingRef.current = false
            return
          }

          // Si on est tout en haut (moins de 20px), toujours afficher
          if (currentScrollY < 20) {
            setIsVisible(true)
            lastScrollYRef.current = currentScrollY
            scrollDirectionRef.current = null
            tickingRef.current = false
            return
          }

          // Vérifier si on est proche du bas (dans les 50px du bas)
          const scrollHeight = scrollContainer.scrollHeight
          const clientHeight = scrollContainer.clientHeight
          const distanceFromBottom = scrollHeight - currentScrollY - clientHeight
          
          // Si on est proche du bas, garder l'état actuel pour éviter les oscillations
          if (distanceFromBottom < 50) {
            lastScrollYRef.current = currentScrollY
            tickingRef.current = false
            return
          }

          // Détecter la direction du scroll avec un seuil de 10px pour plus de stabilité
          const isScrollingDown = currentScrollY > lastScrollYRef.current + 10
          const isScrollingUp = currentScrollY < lastScrollYRef.current - 10

          if (isScrollingDown && scrollDirectionRef.current !== 'down') {
            scrollDirectionRef.current = 'down'
            setIsVisible(false)
          } else if (isScrollingUp && scrollDirectionRef.current !== 'up') {
            scrollDirectionRef.current = 'up'
            setIsVisible(true)
          }

          lastScrollYRef.current = currentScrollY
          tickingRef.current = false
        })

        tickingRef.current = true
      }
    }

    // Attendre que le DOM soit prêt avec un petit délai pour s'assurer que le conteneur existe
    const timeoutId = setTimeout(() => {
      const scrollContainer = document.querySelector('[data-settings-scroll-container]') as HTMLElement
      if (scrollContainer) {
        scrollContainerRef.current = scrollContainer
        scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
      }
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      if (scrollContainerRef.current) {
        scrollContainerRef.current.removeEventListener('scroll', handleScroll)
        scrollContainerRef.current = null
      }
    }
  }, [])

  return (
    <div 
      className={cn(
        "sticky top-0 z-40 bg-background border-b shadow-sm overflow-hidden transition-all duration-300 ease-in-out",
        isVisible ? "max-h-[80px] opacity-100" : "max-h-0 opacity-0 border-b-0"
      )}
    >
      <div className="mx-auto max-w-5xl px-4">
        <Tabs value={active} className="py-3">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-10 -ml-6 w-[calc(100%+30px)]">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} asChild>
                <Link
                  href={`/settings/${t.key}`}
                  prefetch
                  aria-current={active === t.key ? "page" : undefined}
                  onMouseEnter={() => router.prefetch(`/settings/${t.key}`)}
                >
                  {t.label}
                </Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}
