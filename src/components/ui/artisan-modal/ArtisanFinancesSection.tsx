"use client"

import React, { useMemo } from "react"
import dynamic from "next/dynamic"

const BarChart = dynamic(
  () => import("recharts").then((mod) => mod.BarChart),
  { ssr: false }
)
const Bar = dynamic(
  () => import("recharts").then((mod) => mod.Bar),
  { ssr: false }
)
const PieChart = dynamic(
  () => import("recharts").then((mod) => mod.PieChart),
  { ssr: false }
)
const Pie = dynamic(
  () => import("recharts").then((mod) => mod.Pie),
  { ssr: false }
)
const Cell = dynamic(
  () => import("recharts").then((mod) => mod.Cell),
  { ssr: false }
)
const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
)
const Tooltip = dynamic(
  () => import("recharts").then((mod) => mod.Tooltip),
  { ssr: false }
)
const XAxis = dynamic(
  () => import("recharts").then((mod) => mod.XAxis),
  { ssr: false }
)
const YAxis = dynamic(
  () => import("recharts").then((mod) => mod.YAxis),
  { ssr: false }
)
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import { useReferenceData } from "@/hooks/useReferenceData"
import type { Intervention } from "@/lib/api/v2/common/types"

type ArtisanFinancesSectionProps = {
  interventions: Intervention[]
  artisanId: string
}

export function ArtisanFinancesSection({ interventions, artisanId }: ArtisanFinancesSectionProps) {
  const { data: referenceData } = useReferenceData()

  // Calculer les statistiques
  const stats = useMemo(() => {
    let totalCoutSST = 0
    let totalCoutIntervention = 0
    let totalMarge = 0
    let countWithMarge = 0

    interventions.forEach((intervention) => {
      // Les interventions sont déjà filtrées par artisan via getByArtisan
      // Donc toutes les interventions dans cette liste ont cet artisan assigné
      
      if (intervention.costs && Array.isArray(intervention.costs) && intervention.costs.length > 0) {
        // Debug temporaire pour voir les labels disponibles
        if (process.env.NODE_ENV === "development") {
          const labels = intervention.costs.map((c) => c.label).filter(Boolean)
          if (labels.length > 0) {
            console.log("[ArtisanFinancesSection] Labels de coûts trouvés:", labels)
          }
        }

        // Chercher les coûts avec les labels exacts "Coût SST" et "Coût Intervention"
        // Comparaison flexible pour gérer les variations de casse et accents
        const coutSST = intervention.costs.find((cost) => {
          const label = (cost.label || "").trim()
          if (!label) return false
          const normalizedLabel = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          return (
            normalizedLabel === "cout sst" ||
            normalizedLabel === "coût sst" ||
            (normalizedLabel.includes("sst") && normalizedLabel.includes("cout"))
          )
        })

        const coutIntervention = intervention.costs.find((cost) => {
          const label = (cost.label || "").trim()
          if (!label) return false
          const normalizedLabel = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          return (
            normalizedLabel === "cout intervention" ||
            normalizedLabel === "coût intervention" ||
            (normalizedLabel.includes("intervention") && normalizedLabel.includes("cout"))
          )
        })

        if (coutSST) {
          totalCoutSST += Number(coutSST.amount || 0)
        }

        if (coutIntervention) {
          totalCoutIntervention += Number(coutIntervention.amount || 0)
        }

        // Calculer la marge
        if (coutSST && coutIntervention && Number(coutIntervention.amount) > 0) {
          const marge = ((Number(coutIntervention.amount) - Number(coutSST.amount)) / Number(coutIntervention.amount)) * 100
          totalMarge += marge
          countWithMarge++
        }
      }
    })

    const averageMarge = countWithMarge > 0 ? totalMarge / countWithMarge : 0

    return {
      totalInterventions: interventions.length,
      totalCoutSST,
      totalCoutIntervention,
      averageMarge,
    }
  }, [interventions])

  // Données pour le bar chart
  const barChartData = useMemo(
    () => [
      {
        name: "Coût SST",
        value: stats.totalCoutSST,
      },
      {
        name: "Coût Net Inter",
        value: stats.totalCoutIntervention,
      },
    ],
    [stats.totalCoutSST, stats.totalCoutIntervention],
  )

  // Calculer les statistiques pour le pie chart (répartition par statut)
  const pieChartData = useMemo(() => {
    // Compter tous les statuts présents dans les interventions
    const statusCounts: Map<string, number> = new Map()
    const statusColors: Map<string, string> = new Map()

    interventions.forEach((intervention) => {
      if (!intervention.statut_id || !referenceData?.interventionStatuses) return

      const status = referenceData.interventionStatuses.find((s) => s.id === intervention.statut_id)
      if (!status) return

      const statusLabel = status.label || status.code || "Non défini"
      const statusColor = status.color || "#888888"

      // Incrémenter le compteur pour ce statut
      statusCounts.set(statusLabel, (statusCounts.get(statusLabel) || 0) + 1)
      
      // Stocker la couleur si pas déjà définie
      if (!statusColors.has(statusLabel)) {
        statusColors.set(statusLabel, statusColor)
      }
    })

    // Convertir en tableau pour le graphique
    const pieData = Array.from(statusCounts.entries())
      .map(([label, count]) => ({
        name: label,
        value: count,
        color: statusColors.get(label) || "#888888",
      }))
      .sort((a, b) => b.value - a.value) // Trier par valeur décroissante

    return pieData
  }, [interventions, referenceData])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Finances liées à l&apos;artisan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistiques de base */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total d&apos;interventions</p>
            <p className="text-2xl font-semibold">{stats.totalInterventions}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Marge moyenne</p>
            <p className="text-2xl font-semibold">{stats.averageMarge.toFixed(2)}%</p>
          </div>
        </div>

        {/* Graphiques */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Bar Chart */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Stat Cout Artisan</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barChartData}>
                <XAxis dataKey="name" hide />
                <YAxis
                  tickFormatter={(value) => `€${value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}`}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `€${value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    "",
                  ]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? "#FF0000" : "#28a745"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Stat Intervention Artisan</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => (entry.value > 0 ? `${entry.name}: ${entry.value}` : "")}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

