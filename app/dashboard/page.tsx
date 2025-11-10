"use client"

import { useState, useMemo, useEffect } from "react"
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
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Plus } from "lucide-react"
import { interventionsApi } from "@/lib/api/v2"
import { supabase } from "@/lib/supabase-client"

type PeriodType = "week" | "month" | "year"

const STORAGE_KEY = "dashboard-period-type"

export default function DashboardPage() {
  // Initialiser avec "month" par défaut pour éviter les erreurs d'hydratation
  const [periodType, setPeriodType] = useState<PeriodType>("month")
  const [isMounted, setIsMounted] = useState(false)
  const [totalInterventions, setTotalInterventions] = useState<number | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Charger depuis localStorage après le montage côté client
  useEffect(() => {
    setIsMounted(true)
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === "week" || saved === "month" || saved === "year") {
      setPeriodType(saved as PeriodType)
    }
  }, [])

  // Sauvegarder dans localStorage quand la période change
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(STORAGE_KEY, periodType)
    }
  }, [periodType, isMounted])

  // Charger l'utilisateur actuel
  useEffect(() => {
    let cancelled = false

    const loadUser = async () => {
      try {
        const { data: session } = await supabase.auth.getSession()
        const token = session?.session?.access_token

        if (!token) {
          if (!cancelled) {
            setUserId(null)
          }
          return
        }

        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          throw new Error("Impossible de récupérer l'utilisateur")
        }

        const payload = await response.json()
        const user = payload?.user ?? null

        if (!cancelled) {
          setUserId(user?.id ?? null)
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("Erreur lors du chargement de l'utilisateur:", err)
        }
      }
    }

    loadUser()

    return () => {
      cancelled = true
    }
  }, [])

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
    if (!userId || !period.startDate || !period.endDate) {
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
  }, [userId, period.startDate, period.endDate])

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="flex flex-col min-h-screen">
          <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("dashboard")}</h1>
            <p className="text-muted-foreground">Vue d'ensemble de l'activité</p>
          </div>
          <div className="flex gap-2">
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <Button asChild>
                  <Link href="/interventions">Voir les {t("deals")}</Link>
                </Button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem asChild>
                  <Link href="/interventions/new" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Nouvelle intervention
                  </Link>
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
                <ContextMenuItem asChild>
                  <Link href="/artisans/new" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Nouvel artisan
                  </Link>
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </div>
        </div>

        {/* Sélecteur de période */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg flex-wrap">
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

        {/* Première ligne : Mes Interventions (40%), Mes Artisans (30%), Ma Performance (30%) */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-10">
          <div className="lg:col-span-4">
            <InterventionStatsBarChart period={period} />
          </div>
          <div className="lg:col-span-3">
            <ArtisanStatsBarChart period={period} />
          </div>
          <div className="lg:col-span-3 space-y-4">
            <MarginStatsCard period={period} />
            <MarginTotalCard period={period} />
          </div>
        </div>

        {/* Deuxième ligne : Statistiques (70%) et Classement (30%) */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-10">
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
        <ContextMenuItem asChild>
          <Link href="/interventions/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle intervention
          </Link>
        </ContextMenuItem>
        <ContextMenuItem asChild>
          <Link href="/artisans/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nouvel artisan
          </Link>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
