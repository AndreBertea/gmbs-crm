"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { interventionsApi } from "@/lib/api/v2"
import { supabase } from "@/lib/supabase-client"
import type { InterventionStatsByStatus } from "@/lib/api/v2"
import { Loader2, AlertCircle } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import Link from "next/link"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { getInterventionStatusColor } from "@/config/status-colors"

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
  const [interventionsByStatus, setInterventionsByStatus] = useState<Map<string, Array<{
    id: string;
    id_inter: string | null;
    due_date: string | null;
    date_prevue: string | null;
    date: string;
    status: { label: string; code: string } | null;
    adresse: string | null;
    ville: string | null;
    costs: {
      sst?: number;
      materiel?: number;
      intervention?: number;
      marge?: number;
    };
  }>>>(new Map())
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null)
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

        // Charger les stats et toutes les interventions récentes avec coûts
        const [statsData, allInterventionsData] = await Promise.all([
          interventionsApi.getStatsByUser(userId, startDate, endDate),
          interventionsApi.getRecentInterventionsByUser(userId, 100, startDate, endDate).catch(() => [])
        ])

        if (!cancelled) {
          setStats(statsData)
          
          // Grouper les interventions par statut
          type InterventionWithCosts = {
            id: string;
            id_inter: string | null;
            due_date: string | null;
            date_prevue: string | null;
            date: string;
            status: { label: string; code: string } | null;
            adresse: string | null;
            ville: string | null;
            costs: {
              sst?: number;
              materiel?: number;
              intervention?: number;
              marge?: number;
            };
          }
          const groupedByStatus = new Map<string, InterventionWithCosts[]>()
          allInterventionsData.forEach((intervention: InterventionWithCosts) => {
            const statusLabel = intervention.status?.label || "Sans statut"
            if (!groupedByStatus.has(statusLabel)) {
              groupedByStatus.set(statusLabel, [])
            }
            groupedByStatus.get(statusLabel)!.push(intervention)
          })
          
          setInterventionsByStatus(groupedByStatus)
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
      <Card className="border-border/30 shadow-sm/50">
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
      <Card className="border-border/30 shadow-sm/50">
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
      <Card className="border-border/30 shadow-sm/50">
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
      <Card className="border-border/30 shadow-sm/50">
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

  // Les données sont déjà préchargées, pas besoin de handleMouseEnter

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A"
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return null
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount)
  }

  // Composant pour afficher les interventions dans le HoverCard avec style Status Indicators
  const StatusIndicatorContent = ({ statusLabel }: { statusLabel: string }) => {
    const interventions = interventionsByStatus.get(statusLabel) || []
    const statusColor = getInterventionStatusColor(statusLabel) || "hsl(var(--primary))"

    if (interventions.length === 0) {
      return (
        <div className="text-sm text-muted-foreground">
          Aucune intervention pour ce statut
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-sm mb-2">{statusLabel}</h4>
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {interventions.slice(0, 10).map((intervention) => {
            const totalCost = 
              (intervention.costs.sst || 0) +
              (intervention.costs.materiel || 0) +
              (intervention.costs.intervention || 0) +
              (intervention.costs.marge || 0)

            return (
              <div
                key={intervention.id}
                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors"
                onClick={() => router.push(`/interventions/${intervention.id}`)}
              >
                <div
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: statusColor }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {intervention.id_inter || "N/A"}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {totalCost > 0 && (
                      <div>
                        Total: {formatCurrency(totalCost)}
                        {(intervention.costs.sst || intervention.costs.materiel || intervention.costs.intervention || intervention.costs.marge) && (
                          <span className="ml-2">
                            (
                            {intervention.costs.sst && `SST: ${formatCurrency(intervention.costs.sst)}`}
                            {intervention.costs.materiel && `${intervention.costs.sst ? ", " : ""}Mat: ${formatCurrency(intervention.costs.materiel)}`}
                            {intervention.costs.intervention && `${intervention.costs.sst || intervention.costs.materiel ? ", " : ""}Inter: ${formatCurrency(intervention.costs.intervention)}`}
                            {intervention.costs.marge && `${intervention.costs.sst || intervention.costs.materiel || intervention.costs.intervention ? ", " : ""}Marge: ${formatCurrency(intervention.costs.marge)}`}
                            )
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }


  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card 
          className="border-border/30 shadow-sm/50"
        >
          <CardHeader>
            <CardTitle>Mes interventions</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pt-2">
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <XAxis type="number" stroke="#888888" fontSize={12} domain={[0, 'dataMax']} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#888888"
                    fontSize={11}
                    width={90}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={() => null}
                    cursor={false}
                  />
                  <Bar
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
                    label={{ position: "right", fill: "#888888", fontSize: 12 }}
                    onMouseEnter={(data: any, index: number) => {
                      const statusLabel = chartData[index]?.name
                      if (statusLabel && (interventionsByStatus.get(statusLabel) || []).length > 0) {
                        setHoveredStatus(statusLabel)
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredStatus(null)
                    }}
                    onClick={(data: any, index: number) => {
                      const clickedBar = chartData[index]
                      if (clickedBar?.isCheck) {
                        sessionStorage.setItem('pending-intervention-filter', JSON.stringify({
                          property: "isCheck",
                          operator: "eq",
                          value: true
                        }))
                        router.push("/interventions")
                      }
                    }}
                  >
                    {chartData.map((entry, index) => {
                      const statusColor = getInterventionStatusColor(entry.name) || "hsl(var(--primary))"
                      const isHovered = hoveredStatus === entry.name
                      return (
                        <HoverCard key={`hover-${index}`} open={isHovered} openDelay={200} closeDelay={100}>
                          <HoverCardTrigger asChild>
                            <Cell 
                              fill={statusColor}
                              style={{ cursor: "pointer", opacity: isHovered ? 0.9 : 1 }}
                            />
                          </HoverCardTrigger>
                          <HoverCardContent 
                            className="w-96 z-50 max-h-[500px] overflow-y-auto" 
                            side="right"
                            align="start"
                            sideOffset={8}
                          >
                            <StatusIndicatorContent statusLabel={entry.name} />
                          </HoverCardContent>
                        </HoverCard>
                      )
                    })}
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

