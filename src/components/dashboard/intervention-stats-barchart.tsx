"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { interventionsApi } from "@/lib/api/v2"
import type { InterventionStatsByStatus } from "@/lib/api/v2"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { Loader2, AlertCircle } from "lucide-react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import useModal from "@/hooks/useModal"
import { getInterventionStatusColor } from "@/config/status-colors"
import { INTERVENTION_STATUS } from "@/config/interventions"
import { useInterventionStatuses } from "@/hooks/useInterventionStatuses"

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
  const { open: openModal } = useModal()
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

  // Utiliser le hook React Query pour charger l'utilisateur (cache partagé)
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser()
  const userId = currentUser?.id ?? null

  // Charger les statuts depuis la DB pour avoir les couleurs exactes
  const { statuses: dbStatuses, statusesByCode, statusesByLabel } = useInterventionStatuses()

  // Log les statuts chargés depuis la DB pour déboguer
  useEffect(() => {
    if (dbStatuses.length > 0) {
      console.log(`[Dashboard Colors] Statuts chargés depuis la DB (${dbStatuses.length}):`, 
        dbStatuses.map(s => ({ code: s.code, label: s.label, color: s.color }))
      )
    }
  }, [dbStatuses])

  // Charger les statistiques une fois l'utilisateur chargé
  useEffect(() => {
    if (!userId || isLoadingUser) {
      setLoading(isLoadingUser)
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
  }, [userId, isLoadingUser, period?.startDate, period?.endDate])


  // Fonction helper pour obtenir la couleur d'un statut
  // Priorité : 1) DB (source de vérité), 2) INTERVENTION_STATUS, 3) Fallback
  const getStatusColor = (statusLabel: string): string => {
    // Cas spécial pour "Check" qui n'est pas dans INTERVENTION_STATUS
    if (statusLabel === "Check") {
      console.log(`[Dashboard Colors] "Check" → #EF4444 (statut spécial)`)
      return "#EF4444" // Rouge pour Check
    }

    // 1. PRIORITÉ : Chercher dans la DB par label (insensible à la casse)
    // Le hook useInterventionStatuses stocke les labels en minuscule dans statusesByLabel
    const dbStatusByLabel = statusesByLabel.get(statusLabel.toLowerCase())
    if (dbStatusByLabel?.color) {
      console.log(`[Dashboard Colors] "${statusLabel}" → DB (${dbStatusByLabel.code}) → ${dbStatusByLabel.color}`)
      return dbStatusByLabel.color
    }

    // 2. Chercher dans la DB par code (via mapping label → code)
    // Mapping basé sur les labels exacts de la DB
    const labelToCodeMap: Record<string, string> = {
      "Inter en cours": "INTER_EN_COURS",
      "Inter terminée": "INTER_TERMINEE",
      "Inter Terminée": "INTER_TERMINEE",
      "En cours": "INTER_EN_COURS", // Variante
      "Terminé": "TERMINE", // Variante pour TERMINE (pas INTER_TERMINEE)
      "Visite technique": "VISITE_TECHNIQUE", // Variante minuscule
      "Visite Technique": "VISITE_TECHNIQUE", // Label exact de la DB
      "Devis envoyé": "DEVIS_ENVOYE", // Variante minuscule
      "Devis Envoyé": "DEVIS_ENVOYE", // Label exact de la DB
    }

    const mappedCode = labelToCodeMap[statusLabel]
    if (mappedCode) {
      const dbStatusByCode = statusesByCode.get(mappedCode)
      if (dbStatusByCode?.color) {
        console.log(`[Dashboard Colors] "${statusLabel}" → DB (${mappedCode}) → ${dbStatusByCode.color}`)
        return dbStatusByCode.color
      }
    }

    // 3. Chercher dans INTERVENTION_STATUS (fallback)
    const normalizedLabel = statusLabel === "Inter en cours" ? "En cours" : statusLabel
    const statusConfig = Object.values(INTERVENTION_STATUS).find(
      s => s.label === normalizedLabel || s.label.toLowerCase() === normalizedLabel.toLowerCase()
    )
    
    if (statusConfig?.hexColor) {
      console.warn(`[Dashboard Colors] "${statusLabel}" → INTERVENTION_STATUS (${statusConfig.value}) → ${statusConfig.hexColor} (fallback, pas en DB)`)
      return statusConfig.hexColor
    }

    // 4. Dernier fallback
    const fallbackColor = getInterventionStatusColor(statusLabel) || "#6366F1"
    console.warn(`[Dashboard Colors] "${statusLabel}" → FALLBACK → ${fallbackColor}`)
    return fallbackColor
  }

  // Composant personnalisé pour le label de valeur (nombre)
  // S'adapte dynamiquement selon la largeur de la barre
  const CustomValueLabel = (props: any) => {
    const { x, y, width, value } = props
    
    // Si la barre est assez large (>80px), mettre le nombre à l'intérieur à droite
    // Sinon, le mettre à l'extérieur pour éviter qu'il dépasse
    if (width > 80) {
      return (
        <text
          x={x + width - 8}
          y={y + 12}
          fill="hsl(var(--foreground))"
          textAnchor="end"
          fontSize={12}
          fontWeight={600}
        >
          {value}
        </text>
      )
    } else {
      // Barre trop petite, mettre le nombre à l'extérieur
      return (
        <text
          x={x + width + 8}
          y={y + 12}
          fill="hsl(var(--foreground))"
          textAnchor="start"
          fontSize={12}
          fontWeight={600}
        >
          {value}
        </text>
      )
    }
  }

  // Composant personnalisé pour le label du nom (statut)
  // Positionnement intelligent selon la largeur de la barre
  const CustomNameLabel = (props: any) => {
    const { x, y, width, value } = props
    
    // Calculer la largeur approximative du texte (environ 7px par caractère)
    const textWidth = value.length * 7
    
    // Si la barre est très petite (<50px), mettre le nom à l'extérieur à gauche
    if (width < 50) {
      return (
        <text
          x={x - 8}
          y={y + 12}
          fill="hsl(var(--foreground))"
          textAnchor="end"
          fontSize={11}
          fontWeight={500}
        >
          {value}
        </text>
      )
    }
    
    // Si le texte dépasse mais la barre est moyenne, tronquer avec "..."
    if (textWidth > width - 16 && width < 80) {
      const maxChars = Math.floor((width - 24) / 7) // -24 pour l'espace et "..."
      const truncated = value.substring(0, Math.max(1, maxChars)) + "..."
      return (
        <text
          x={x + 8}
          y={y + 12}
          fill="#FFFFFF"
          textAnchor="start"
          fontSize={12}
          fontWeight={600}
        >
          {truncated}
        </text>
      )
    }
    
    // Sinon, afficher normalement à l'intérieur
    return (
      <text
        x={x + 8}
        y={y + 12}
        fill="#FFFFFF"
        textAnchor="start"
        fontSize={12}
        fontWeight={600}
      >
        {value}
      </text>
    )
  }

  // Statuts fondamentaux à afficher
  const fundamentalStatuses = ["Demandé", "Inter en cours", "Visite technique", "Accepté", "Check"]

  // Créer le chartConfig avec les couleurs pour chaque statut possible
  const chartConfig: ChartConfig = {
    value: {
      label: "Valeur",
      color: "hsl(var(--chart-1))",
    },
  }

  // Ajouter une entrée pour chaque statut possible dans le config (pour les tooltips)
  fundamentalStatuses.forEach((status) => {
    chartConfig[status] = {
      label: status,
      color: getStatusColor(status),
    }
  })
  chartConfig["Check"] = {
    label: "Check",
    color: getStatusColor("Check"),
  }

  // Préparer les données pour le graphique (uniquement les statuts fondamentaux)
  const chartData = stats?.by_status_label
    ? Object.entries(stats.by_status_label)
        .map(([label, count]) => {
          const color = getStatusColor(label)
          return {
            name: label,
            value: count,
            isCheck: false,
            color: color, // Ajouter la couleur directement dans les données
          }
        })
        .filter((item) => item.value > 0 && fundamentalStatuses.includes(item.name))
        .map((item) => {
          // Log pour déboguer les couleurs
          console.log(`[Dashboard Chart] Statut: "${item.name}", Count: ${item.value}, Color: ${item.color}`)
          return item
        })
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
                  isCheck: true,
                  color: "#EF4444", // Rouge pour Check
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
    
    // Trouver la couleur depuis INTERVENTION_STATUS (priorité à la palette de la page interventions)
    // Utiliser la même logique que getStatusColor
    const statusColor = getStatusColor(statusLabel)

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
          {interventions.slice(0, 5).map((intervention) => {
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
                    {intervention.adresse && (
                      <div className="truncate">
                        {intervention.adresse}
                        {intervention.ville && `, ${intervention.ville}`}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {intervention.due_date && (
                        <span>Due: {formatDate(intervention.due_date)}</span>
                      )}
                      {intervention.date_prevue && (
                        <span>Prévue: {formatDate(intervention.date_prevue)}</span>
                      )}
                    </div>
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
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    hide
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <Bar
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
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
                    <LabelList
                      dataKey="name"
                      content={<CustomNameLabel />}
                    />
                    <LabelList
                      dataKey="value"
                      content={<CustomValueLabel />}
                    />
                    {chartData.map((entry, index) => {
                      const statusColor = entry.color || getStatusColor(entry.name)
                      return (
                        <Cell 
                          key={`cell-${index}`}
                          fill={statusColor}
                          style={{ cursor: "pointer" }}
                        />
                      )
                    })}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>

            {/* HoverCard séparé pour afficher les détails au survol */}
            {hoveredStatus && (interventionsByStatus.get(hoveredStatus) || []).length > 0 && (
              <HoverCard open={true} openDelay={200} closeDelay={100}>
                <HoverCardContent 
                  className="w-96 z-50 max-h-[500px] overflow-y-auto" 
                  side="right"
                  align="start"
                  sideOffset={8}
                >
                  <StatusIndicatorContent statusLabel={hoveredStatus} />
                </HoverCardContent>
              </HoverCard>
            )}

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
        <ContextMenuItem onClick={() => openModal("new", { content: "new-intervention" })} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle intervention
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

