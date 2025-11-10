"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { interventionsApi } from "@/lib/api/v2"
import { supabase } from "@/lib/supabase-client"
import type { InterventionStatsByStatus } from "@/lib/api/v2"
import { Loader2 } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import Link from "next/link"
import { Plus, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface InterventionStatsBarChartProps {
  period?: {
    startDate?: string
    endDate?: string
  }
}

export function InterventionStatsBarChart({ period }: InterventionStatsBarChartProps) {
  const [stats, setStats] = useState<InterventionStatsByStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

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
            setLoading(false)
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
          setError(err.message || "Erreur lors du chargement de l'utilisateur")
          setLoading(false)
        }
      }
    }

    loadUser()

    return () => {
      cancelled = true
    }
  }, [])

  // Charger les statistiques une fois l'utilisateur chargé
  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    let cancelled = false

    const loadStats = async () => {
      try {
        setLoading(true)
        setError(null)

        // Calculer les dates si non fournies (mois en cours par défaut)
        let startDate = period?.startDate
        let endDate = period?.endDate

        if (!startDate || !endDate) {
          const now = new Date()
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

          startDate = startDate || startOfMonth.toISOString()
          endDate = endDate || endOfMonth.toISOString()
        }

        const statsData = await interventionsApi.getStatsByUser(userId, startDate, endDate)

        if (!cancelled) {
          setStats(statsData)
          setLoading(false)
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Erreur lors du chargement des statistiques")
          setLoading(false)
        }
      }
    }

    loadStats()

    return () => {
      cancelled = true
    }
  }, [userId, period?.startDate, period?.endDate])

  // Statuts fondamentaux à afficher
  const fundamentalStatuses = ["Demandé", "Inter en cours", "Visite technique", "Accepté", "Check"]

  // Préparer les données pour le graphique (uniquement les statuts fondamentaux)
  const chartData = stats?.by_status_label
    ? Object.entries(stats.by_status_label)
        .map(([label, count]) => ({
          name: label,
          value: count,
          isCheck: false, // Pour identifier les barres normales
        }))
        .filter((item) => item.value > 0 && fundamentalStatuses.includes(item.name))
        .sort((a, b) => {
          // Trier selon l'ordre des statuts fondamentaux
          const indexA = fundamentalStatuses.indexOf(a.name)
          const indexB = fundamentalStatuses.indexOf(b.name)
          if (indexA === -1) return 1
          if (indexB === -1) return -1
          return indexA - indexB
        })
        .concat(
          // Ajouter la barre "Check" si elle existe
          stats.interventions_a_checker && stats.interventions_a_checker > 0
            ? [
                {
                  name: "Check",
                  value: stats.interventions_a_checker,
                  isCheck: true, // Pour identifier la barre Check
                },
              ]
            : []
        )
    : []

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mes interventions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[350px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mes interventions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mes interventions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Veuillez vous connecter pour voir vos statistiques
          </p>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mes interventions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucune intervention trouvée pour cette période
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card>
          <CardHeader>
            <CardTitle>Mes interventions</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <XAxis type="number" stroke="#888888" fontSize={12} domain={[0, 'dataMax']} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    width={120}
                    tickLine={false}
                    axisLine={false}
                  />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="hsl(var(--primary))"
                  radius={[0, 4, 4, 0]}
                  label={{ position: "right", fill: "#888888", fontSize: 12 }}
                  onClick={(data: any, index: number) => {
                    const clickedBar = chartData[index]
                    if (clickedBar?.isCheck) {
                      // Clic sur la barre Check
                      sessionStorage.setItem('pending-intervention-filter', JSON.stringify({
                        property: "isCheck",
                        operator: "eq",
                        value: true
                      }))
                      router.push("/interventions")
                    }
                  }}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.isCheck ? "#EF4444" : "hsl(var(--primary))"}
                      style={{ cursor: entry.isCheck ? "pointer" : "default" }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>

            {/* Ligne pour les interventions à checker */}
            {stats && (stats.interventions_a_checker ?? 0) > 0 && (
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // Stocker l'intention de filtre dans sessionStorage
                    sessionStorage.setItem('pending-intervention-filter', JSON.stringify({
                      property: "isCheck",
                      operator: "eq",
                      value: true
                    }))
                    // Naviguer vers la page interventions
                    router.push("/interventions")
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg border bg-red-50 border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-900">Interventions à checker</span>
                  </div>
                  <span className="text-sm font-semibold text-red-700">{stats.interventions_a_checker}</span>
                </button>
              </div>
            )}
          </CardContent>
        </Card>
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
  )
}

