"use client"

import { useState, useMemo } from "react"
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

type PeriodType = "week" | "month" | "year"

export default function DashboardPage() {
  const [periodType, setPeriodType] = useState<PeriodType>("month")

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
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("dashboard")}</h1>
            <p className="text-muted-foreground">Vue d'ensemble de l'activité</p>
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
