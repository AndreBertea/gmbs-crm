"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { InterventionStatsBarChart } from "@/components/dashboard/intervention-stats-barchart"
import { ArtisanStatsList } from "@/components/dashboard/artisan-stats-list"
import { MarginStatsCard } from "@/components/dashboard/margin-stats-card"
import { MarginTotalCard } from "@/components/dashboard/margin-total-card"
import { GestionnaireRankingPodium } from "@/components/dashboard/gestionnaire-ranking-podium"
import { WeeklyStatsTable } from "@/components/dashboard/weekly-stats-table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { t } from "@/config/domain"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Plus } from "lucide-react"
import { interventionsApi } from "@/lib/api/v2"
import { useRevealTransition } from "@/hooks/useRevealTransition"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import useModal from "@/hooks/useModal"
import { useArtisanModal } from "@/hooks/useArtisanModal"

type PeriodType = "week" | "month" | "year"

const STORAGE_KEY = "dashboard-period-type"

export default function DashboardPage() {
  // Initialiser avec "month" par défaut pour éviter les erreurs d'hydratation
  const [periodType, setPeriodType] = useState<PeriodType>("month")
  const [isMounted, setIsMounted] = useState(false)
  const [totalInterventions, setTotalInterventions] = useState<number | null>(null)
  const [showTransition, setShowTransition] = useState(false)
  const { open: openModal } = useModal()
  const artisanModal = useArtisanModal()
  
  // Utiliser le hook React Query pour charger l'utilisateur (cache partagé)
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser()
  const userId = currentUser?.id ?? null
  
  // Références pour l'animation
  const dashboardContentRef = useRef<HTMLDivElement>(null)
  const loginIframeRef = useRef<HTMLIFrameElement>(null)
  
  // Hook pour l'animation de transition
  const {
    isAnimating,
    circleSizeMotion,
    buttonPosition,
    startAnimationFromPosition,
  } = useRevealTransition()

  // Charger depuis localStorage après le montage côté client
  useEffect(() => {
    setIsMounted(true)
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === "week" || saved === "month" || saved === "year") {
      setPeriodType(saved as PeriodType)
    }
  }, [])

  // Détecter la transition depuis login et démarrer l'animation
  useEffect(() => {
    if (!isMounted) return

    const transitionData = sessionStorage.getItem('revealTransition')
    if (transitionData) {
      try {
        const data = JSON.parse(transitionData)
        if (data.from === 'login' && Date.now() - data.timestamp < 5000) {
          setShowTransition(true)
          sessionStorage.removeItem('revealTransition')
          setTimeout(() => {
            startAnimationFromPosition(data.buttonPosition)
          }, 100)
        }
      } catch (e) {
        console.error('Erreur lors de la lecture des données de transition:', e)
        sessionStorage.removeItem('revealTransition')
      }
    }
  }, [isMounted, startAnimationFromPosition])

  // Appliquer le clipPath au contenu dashboard pendant l'animation
  useEffect(() => {
    if (!isAnimating || !buttonPosition || !dashboardContentRef.current) return

    const unsubscribe = circleSizeMotion.on('change', (size: number) => {
      if (dashboardContentRef.current) {
        const clipPath = `circle(${size}px at ${buttonPosition.x}px ${buttonPosition.y}px)`
        const element = dashboardContentRef.current
        element.style.clipPath = clipPath
        ;(element.style as any).webkitClipPath = clipPath
      }
    })

    return () => unsubscribe()
  }, [isAnimating, buttonPosition, circleSizeMotion])

  // Appliquer le mask inversé à l'iframe login pendant l'animation
  useEffect(() => {
    if (!isAnimating || !buttonPosition || !loginIframeRef.current) return

    const unsubscribe = circleSizeMotion.on('change', (size: number) => {
      if (loginIframeRef.current) {
        const mask = size === 0
          ? 'black' // Tout visible au début
          : `radial-gradient(circle ${size}px at ${buttonPosition.x}px ${buttonPosition.y}px, transparent ${size}px, black ${size + 0.1}px)`
        const element = loginIframeRef.current
        element.style.mask = mask
        ;(element.style as any).webkitMask = mask
      }
    })

    return () => unsubscribe()
  }, [isAnimating, buttonPosition, circleSizeMotion])

  // Nettoyer après la fin de l'animation (3 secondes)
  useEffect(() => {
    if (!isAnimating) return

    const timer = setTimeout(() => {
      if (dashboardContentRef.current) {
        dashboardContentRef.current.style.clipPath = 'none'
        ;(dashboardContentRef.current.style as any).webkitClipPath = 'none'
      }
      if (loginIframeRef.current) {
        loginIframeRef.current.style.display = 'none'
      }
      setShowTransition(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [isAnimating])

  // Sauvegarder dans localStorage quand la période change
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(STORAGE_KEY, periodType)
    }
  }, [periodType, isMounted])

  // Calculer les dates selon la période sélectionnée
  const period = useMemo(() => {
    const now = new Date()
    let startDate: Date
    let endDate: Date

    if (periodType === "week") {
      // Semaine en cours (lundi à vendredi)
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      startDate = new Date(now.getFullYear(), now.getMonth(), diff)
      startDate.setHours(0, 0, 0, 0)
      
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 4) // Vendredi
      endDate.setHours(23, 59, 59, 999)
    } else if (periodType === "month") {
      // Mois en cours
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      startDate.setHours(0, 0, 0, 0)
      
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    } else {
      // Année en cours
      startDate = new Date(now.getFullYear(), 0, 1)
      startDate.setHours(0, 0, 0, 0)
      
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }
  }, [periodType])

  const periodLabel = useMemo(() => {
    const now = new Date()
    if (periodType === "week") {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(now.getFullYear(), now.getMonth(), diff)
      const friday = new Date(monday)
      friday.setDate(monday.getDate() + 4)
      
      return `Semaine du ${monday.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} au ${friday.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
    } else if (periodType === "month") {
      return now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    } else {
      return `Année ${now.getFullYear()}`
    }
  }, [periodType])

  // Charger le nombre total d'interventions pour la période
  useEffect(() => {
    if (!userId || isLoadingUser || !period.startDate || !period.endDate) {
      setTotalInterventions(null)
      return
    }

    let cancelled = false

    const loadTotalInterventions = async () => {
      try {
        const statsData = await interventionsApi.getStatsByUser(userId, period.startDate, period.endDate)
        if (!cancelled) {
          setTotalInterventions(statsData.total)
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("Erreur lors du chargement du total d'interventions:", err)
          setTotalInterventions(null)
        }
      }
    }

    loadTotalInterventions()

    return () => {
      cancelled = true
    }
  }, [userId, isLoadingUser, period.startDate, period.endDate])

  return (
    <>
      {/* Iframe login pour l'animation de transition */}
      {showTransition && (
        <iframe
          ref={loginIframeRef}
          src="/login"
          className="fixed inset-0 w-full h-full border-none pointer-events-none z-[90]"
          style={{
            mask: 'black',
          } as React.CSSProperties & { WebkitMask?: string }}
          aria-hidden="true"
          title="Login transition"
        />
      )}

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div 
            ref={dashboardContentRef}
            className="flex flex-col min-h-screen relative z-10"
          >
            <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("dashboard")}</h1>
            <p className="text-muted-foreground">Vue d&apos;ensemble de l&apos;activité</p>
          </div>
          
          {/* Sélecteur de période au milieu */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Période :</span>
              {isMounted ? (
                <Select value={periodType} onValueChange={(value) => setPeriodType(value as PeriodType)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Semaine</SelectItem>
                    <SelectItem value="month">Mois</SelectItem>
                    <SelectItem value="year">Année</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="w-[180px] h-10 rounded-md border bg-background flex items-center px-3">
                  <span className="text-sm text-muted-foreground">Chargement...</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{periodLabel}</span>
              <span className="text-foreground font-medium">
                {new Date(period.startDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })} - {new Date(period.endDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              {totalInterventions !== null && (
                <span className="text-foreground font-medium">
                  {totalInterventions} intervention{totalInterventions > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <Button asChild>
                  <Link href="/interventions">Voir les {t("deals")}</Link>
                </Button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => openModal("new", { content: "new-intervention" })} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Nouvelle intervention
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <Button variant="outline" asChild>
                  <Link href="/artisans">Voir les {t("contacts")}</Link>
                </Button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => artisanModal.openNew()} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Nouvel artisan
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </div>
        </div>

        {/* Première ligne : Interventions (40%), Artisans (30%), Performance (30%) */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-10">
          <div className="lg:col-span-4">
            <InterventionStatsBarChart period={period} />
          </div>
          <div className="lg:col-span-3">
            <ArtisanStatsList period={period} />
          </div>
          <div className="lg:col-span-3 space-y-4">
            {/* Performance Moyenne et Totale côte à côte */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <MarginStatsCard period={period} />
              </div>
              <div>
                <MarginTotalCard period={period} />
              </div>
            </div>
          </div>
        </div>

        {/* Deuxième ligne : Statistiques (70%) et Podium (30%) alignés */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-10 items-end">
          <div className="lg:col-span-7">
            <WeeklyStatsTable period={period} />
          </div>
          <div className="lg:col-span-3">
            <GestionnaireRankingPodium period={period} />
          </div>
        </div>
      </div>
    </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => openModal("new", { content: "new-intervention" })} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle intervention
        </ContextMenuItem>
        <ContextMenuItem onClick={() => artisanModal.openNew()} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouvel artisan
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
    </>
  )
}
