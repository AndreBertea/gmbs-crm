"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { InterventionStatsBarChart } from "@/components/dashboard/intervention-stats-barchart"
import { ArtisanStatsBarChart } from "@/components/dashboard/artisan-stats-barchart"
import { MarginStatsCard } from "@/components/dashboard/margin-stats-card"
import { MarginTotalCard } from "@/components/dashboard/margin-total-card"
import { GestionnaireRankingPodium } from "@/components/dashboard/gestionnaire-ranking-podium"
import { WeeklyStatsTable } from "@/components/dashboard/weekly-stats-table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { t } from "@/config/domain"
import { useRevealTransition } from "@/hooks/useRevealTransition"

type PeriodType = "week" | "month" | "year"

type ButtonPosition = {
  x: number
  y: number
}

export default function DashboardPage() {
  const [periodType, setPeriodType] = useState<PeriodType>("month")
  const [showTransition, setShowTransition] = useState(false)
  const [buttonPosition, setButtonPosition] = useState<ButtonPosition | null>(null)
  const dashboardContentRef = useRef<HTMLDivElement>(null)
  const loginIframeRef = useRef<HTMLDivElement>(null)
  const { isAnimating, circleSizeMotion, circleSize, startAnimationFromPosition } = useRevealTransition()

  // Détecter la transition depuis login
  useEffect(() => {
    // Vérifier si on vient de login
    const transitionData = sessionStorage.getItem('revealTransition')
    if (transitionData) {
      try {
        const data = JSON.parse(transitionData)
        // Vérifier que c'est récent (moins de 5 secondes)
        if (data.from === 'login' && Date.now() - data.timestamp < 5000) {
          setButtonPosition(data.buttonPosition)
          setShowTransition(true)
          
          // Nettoyer sessionStorage
          sessionStorage.removeItem('revealTransition')
          
          // Démarrer l'animation après un court délai pour laisser le DOM se charger
          setTimeout(() => {
            if (data.buttonPosition) {
              startAnimationFromPosition(data.buttonPosition)
            }
          }, 100)
        }
      } catch (e) {
        console.error('Erreur lors de la lecture de revealTransition:', e)
        sessionStorage.removeItem('revealTransition')
      }
    }
  }, [startAnimationFromPosition])

  // Gérer l'animation du clipPath pour le dashboard (visible à l'intérieur du cercle)
  useEffect(() => {
    if (!showTransition || !isAnimating || !buttonPosition || !dashboardContentRef.current) return
    
    const unsubscribe = circleSizeMotion.on('change', (size) => {
      const clipPath = `circle(${size}px at ${buttonPosition.x}px ${buttonPosition.y}px)`
      const webkitClipPath = `circle(${size}px at ${buttonPosition.x}px ${buttonPosition.y}px)`
      
      if (dashboardContentRef.current) {
        dashboardContentRef.current.style.clipPath = clipPath
        ;(dashboardContentRef.current.style as any).webkitClipPath = webkitClipPath
      }
    })
    
    return () => unsubscribe()
  }, [showTransition, isAnimating, buttonPosition, circleSizeMotion])

  // Gérer l'animation du clipPath inversé pour l'iframe login (visible à l'extérieur du cercle)
  useEffect(() => {
    if (!showTransition || !buttonPosition || !loginIframeRef.current) return
    
    const updateMask = (size: number) => {
      // Mask inversé : visible partout SAUF à l'intérieur du cercle
      // Au début (size = 0), tout est visible (black partout)
      // Pendant l'animation, l'intérieur devient transparent, l'extérieur reste visible
      const mask = size === 0 
        ? 'black' // Tout visible au début
        : `radial-gradient(circle ${size}px at ${buttonPosition.x}px ${buttonPosition.y}px, transparent ${size}px, black ${size + 0.1}px)`
      const webkitMask = size === 0
        ? 'black'
        : `radial-gradient(circle ${size}px at ${buttonPosition.x}px ${buttonPosition.y}px, transparent ${size}px, black ${size + 0.1}px)`
      
      if (loginIframeRef.current) {
        loginIframeRef.current.style.mask = mask
        ;(loginIframeRef.current.style as any).webkitMask = webkitMask
      }
    }
    
    // Initialiser le mask au début
    if (!isAnimating) {
      updateMask(0)
      return
    }
    
    // Mettre à jour le mask pendant l'animation
    const unsubscribe = circleSizeMotion.on('change', (size) => {
      updateMask(size)
    })
    
    return () => unsubscribe()
  }, [showTransition, isAnimating, buttonPosition, circleSizeMotion])

  // Fin de l'animation - retirer le clipPath et masquer l'iframe login
  useEffect(() => {
    if (!showTransition || !isAnimating) return
    
    const timer = setTimeout(() => {
      if (dashboardContentRef.current) {
        dashboardContentRef.current.style.clipPath = 'none'
        ;(dashboardContentRef.current.style as any).webkitClipPath = 'none'
      }
      if (loginIframeRef.current) {
        loginIframeRef.current.style.opacity = '0'
        loginIframeRef.current.style.pointerEvents = 'none'
      }
      // Masquer complètement l'iframe après la transition d'opacité
      setTimeout(() => {
        setShowTransition(false)
      }, 300) // Délai pour la transition d'opacité
    }, 3000) // 3 secondes
    
    return () => clearTimeout(timer)
  }, [showTransition, isAnimating])

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

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Iframe de la page login - visible à l'extérieur du cercle */}
      {showTransition && buttonPosition && (
        <div
          ref={loginIframeRef}
          className="fixed inset-0 z-[90]"
          style={{
            pointerEvents: 'none',
            opacity: showTransition ? 1 : 0,
            transition: 'opacity 0.3s ease-out',
          }}
        >
          <iframe
            src="/login"
            className="w-full h-full border-0"
            style={{
              pointerEvents: 'none',
            }}
            aria-hidden="true"
            title="Login"
            loading="eager"
          />
        </div>
      )}
      
      <div 
        ref={dashboardContentRef}
        className="flex-1 p-6 space-y-6 relative z-10"
        style={{
          clipPath: showTransition && buttonPosition 
            ? `circle(0px at ${buttonPosition.x}px ${buttonPosition.y}px)`
            : 'none',
          WebkitClipPath: showTransition && buttonPosition
            ? `circle(0px at ${buttonPosition.x}px ${buttonPosition.y}px)`
            : 'none',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("dashboard")}</h1>
            <p className="text-muted-foreground">Vue d&apos;ensemble de l&apos;activité</p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/interventions">Aller aux {t("deals")}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/artisans">Voir les {t("contacts")}</Link>
            </Button>
          </div>
        </div>

        {/* Sélecteur de période */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Période :</span>
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
          </div>
          <div className="text-sm text-muted-foreground">
            {periodLabel}
          </div>
        </div>

        {/* Statistiques rapides - Marge */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <MarginStatsCard period={period} />
          <MarginTotalCard period={period} />
        </div>

        {/* Statistiques par statut - Bar charts horizontaux */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <InterventionStatsBarChart period={period} />
          <ArtisanStatsBarChart period={period} />
        </div>

        {/* Classement des gestionnaires */}
        <GestionnaireRankingPodium period={period} />

        {/* Tableau des actions de la semaine */}
        <WeeklyStatsTable />
      </div>
    </div>
  )
}
