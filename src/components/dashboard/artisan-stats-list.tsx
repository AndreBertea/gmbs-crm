"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { artisansApi } from "@/lib/api/v2"
import type { ArtisanStatsByStatus } from "@/lib/api/v2"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { Loader2, FileText, Plus } from "lucide-react"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useArtisanModal } from "@/hooks/useArtisanModal"
import { useInterventionModal } from "@/hooks/useInterventionModal"
import { getArtisanStatusStyles } from "@/config/status-colors"
import { Loader2 as Loader2Icon } from "lucide-react"

interface ArtisanStatsListProps {
  period?: {
    startDate?: string
    endDate?: string
  }
}

export function ArtisanStatsList({ period }: ArtisanStatsListProps) {
  const [stats, setStats] = useState<ArtisanStatsByStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const artisanModal = useArtisanModal()
  const { open: openArtisanModal } = artisanModal
  const { open: openInterventionModal } = useInterventionModal()

  // Utiliser le hook React Query pour charger l'utilisateur (cache partagé)
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser()
  const userId = currentUser?.id ?? null

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

        // Pour les artisans, on charge la somme totale (sans restriction de période)
        // La période reste optionnelle pour une utilisation future si nécessaire
        const startDate = period?.startDate
        const endDate = period?.endDate

        // Charger les stats
        const statsData = await artisansApi.getStatsByGestionnaire(userId, startDate, endDate)

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
  }, [userId, isLoadingUser, period?.startDate, period?.endDate])


  // Préparer les données pour la liste (statuts avec nombre > 0)
  const listItems = stats?.by_status_label
    ? Object.entries(stats.by_status_label)
        .map(([label, count]) => ({
          label,
          count,
        }))
        .filter((item) => {
          // Exclure les statuts archivés
          const normalizedLabel = item.label.toLowerCase()
          return item.count > 0 && 
                 normalizedLabel !== "archivé" && 
                 normalizedLabel !== "archiver" && 
                 normalizedLabel !== "archive"
        })
        .sort((a, b) => b.count - a.count) // Trier par nombre décroissant
    : []

  if (loading) {
    return (
      <Card className="bg-background border-border/5 shadow-sm/30 hover:shadow-lg hover:border-border/50 transition-all duration-300">
        <CardHeader>
          <CardTitle>Mes Artisans</CardTitle>
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
      <Card className="bg-background border-border/5 shadow-sm/30 hover:shadow-lg hover:border-border/50 transition-all duration-300">
        <CardHeader>
          <CardTitle>Mes Artisans</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!userId) {
    return (
      <Card className="bg-background border-border/5 shadow-sm/30 hover:shadow-lg hover:border-border/50 transition-all duration-300">
        <CardHeader>
          <CardTitle>Mes Artisans</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Veuillez vous connecter pour voir vos statistiques
          </p>
        </CardContent>
      </Card>
    )
  }

  const hasData = listItems.length > 0 || (stats?.dossiers_a_completer ?? 0) > 0

  if (!hasData) {
    return (
      <Card className="bg-background border-border/5 shadow-sm/30 hover:shadow-lg hover:border-border/50 transition-all duration-300">
        <CardHeader>
          <CardTitle>Mes Artisans</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucun artisan trouvé pour ce gestionnaire
          </p>
        </CardContent>
      </Card>
    )
  }

  // Les données sont déjà préchargées, pas besoin de handleMouseEnter

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount)
  }

  // Fonction helper pour naviguer vers la page artisans avec les filtres appropriés
  const handleStatusClick = (statusLabel: string) => {
    // Stocker l'intention de filtre dans sessionStorage
    sessionStorage.setItem('pending-artisan-filter', JSON.stringify({
      viewId: "ma-liste-artisans", // Activer la vue "Ma liste artisans"
      statusFilter: statusLabel // Activer le filtre de statut correspondant
    }))
    // Naviguer vers la page artisans
    router.push("/artisans")
  }

  // Composant pour afficher les artisans dans le HoverCard avec style Status Indicators
  const ArtisanStatusContent = ({ 
    statusLabel,
    onOpenArtisan,
    onOpenIntervention 
  }: { 
    statusLabel: string
    onOpenArtisan: (id: string) => void
    onOpenIntervention: (id: string) => void
  }) => {
    const [artisansData, setArtisansData] = useState<Array<{
      artisan_id: string;
      artisan_nom: string;
      artisan_prenom: string;
      recent_interventions: Array<{
        id: string;
        id_inter: string | null;
        date: string;
        marge: number;
        status_label: string | null;
        status_color: string | null;
      }>;
    }> | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Charger les données au montage du composant avec période
    useEffect(() => {
      if (!userId || !statusLabel) return

      let cancelled = false

      const loadData = async () => {
        try {
          setLoading(true)
          setError(null)
          const data = await artisansApi.getArtisansByStatusWithRecentInterventions(
            userId, 
            statusLabel,
            period?.startDate,  // Passer la période
            period?.endDate     // Passer la période
          )
          if (!cancelled) {
            setArtisansData(data)
            setLoading(false)
          }
        } catch (err: any) {
          if (!cancelled) {
            setError(err.message || "Erreur lors du chargement")
            setLoading(false)
          }
        }
      }

      loadData()

      return () => {
        cancelled = true
      }
    }, [userId, statusLabel, period?.startDate, period?.endDate])

    if (loading) {
      return (
        <div className="flex items-center justify-center p-4">
          <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="text-sm text-destructive p-2">
          Erreur de chargement
        </div>
      )
    }

    if (!artisansData || artisansData.length === 0) {
      return (
        <div className="text-sm text-muted-foreground p-2">
          Aucun artisan avec interventions pour ce statut
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <h4 className="font-semibold text-sm mb-2">{statusLabel}</h4>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {artisansData.map((artisan) => (
            <div key={artisan.artisan_id} className="space-y-1.5">
              <div 
                className="font-medium text-sm cursor-pointer hover:text-primary hover:underline transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenArtisan(artisan.artisan_id)
                }}
              >
                {artisan.artisan_prenom} {artisan.artisan_nom}
              </div>
              {artisan.recent_interventions.length > 0 ? (
                <div className="space-y-1 pl-2">
                  {artisan.recent_interventions.map((intervention) => (
                    <div
                      key={intervention.id}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenIntervention(intervention.id)
                      }}
                    >
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">
                          {intervention.id_inter || "N/A"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Statut : <span style={{ color: intervention.status_color || "#6366F1" }}>{intervention.status_label || "N/A"}</span> | Marge: {formatCurrency(intervention.marge)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground pl-2">
                  Aucune intervention récente
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Composant pour afficher les artisans avec dossiers à compléter dans le HoverCard
  const DossiersACompleterContent = ({ 
    onOpenArtisan 
  }: { 
    onOpenArtisan: (id: string) => void 
  }) => {
    const [artisansData, setArtisansData] = useState<Array<{
      artisan_id: string;
      artisan_nom: string;
      artisan_prenom: string;
    }> | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Charger les données au montage du composant
    useEffect(() => {
      if (!userId) return

      let cancelled = false

      const loadData = async () => {
        try {
          setLoading(true)
          setError(null)
          const data = await artisansApi.getArtisansWithDossiersACompleter(userId)
          if (!cancelled) {
            setArtisansData(data)
            setLoading(false)
          }
        } catch (err: any) {
          if (!cancelled) {
            setError(err.message || "Erreur lors du chargement")
            setLoading(false)
          }
        }
      }

      loadData()

      return () => {
        cancelled = true
      }
    }, [userId])

    if (loading) {
      return (
        <div className="flex items-center justify-center p-4">
          <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="text-sm text-destructive p-2">
          Erreur de chargement
        </div>
      )
    }

    if (!artisansData || artisansData.length === 0) {
      return (
        <div className="text-sm text-muted-foreground p-2">
          Aucun artisan avec dossier à compléter
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-sm mb-2">Dossiers à compléter</h4>
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {artisansData.map((artisan) => (
            <div
              key={artisan.artisan_id}
              className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onOpenArtisan(artisan.artisan_id)
              }}
            >
              <div className="h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">
                  {artisan.artisan_prenom} {artisan.artisan_nom}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card 
          className="bg-background border-border/5 shadow-sm/30 hover:shadow-lg hover:border-border/50 transition-all duration-300"
        >
          <CardHeader>
            <CardTitle>Mes Artisans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Liste des statuts */}
              {listItems.map((item) => {
                const statusStyles = getArtisanStatusStyles(item.label)
                
                return (
                  <HoverCard key={item.label} openDelay={200} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStatusClick(item.label)
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border ${statusStyles.bg} ${statusStyles.border} ${statusStyles.hover} transition-colors cursor-pointer border-l-4`}
                      >
                        <span className={`text-sm font-semibold ${statusStyles.text}`}>{item.label}</span>
                        <span className={`text-sm font-bold ${statusStyles.text}`}>{item.count}</span>
                      </button>
                    </HoverCardTrigger>
                    <HoverCardContent 
                      className="w-96 z-50 max-h-[500px] overflow-y-auto" 
                      side="right"
                      align="start"
                      sideOffset={8}
                    >
                      <ArtisanStatusContent 
                        statusLabel={item.label}
                        onOpenArtisan={openArtisanModal}
                        onOpenIntervention={openInterventionModal}
                      />
                    </HoverCardContent>
                  </HoverCard>
                )
              })}

              {/* Ligne pour les dossiers à compléter */}
              {stats && (stats.dossiers_a_completer ?? 0) > 0 && (
                <HoverCard openDelay={200} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // Stocker l'intention de filtre dans sessionStorage
                        sessionStorage.setItem('pending-artisan-filter', JSON.stringify({
                          viewId: "ma-liste-artisans", // Activer la vue "Ma liste artisans"
                          statusFilter: "Candidat" // Activer le filtre de statut "Candidat"
                        }))
                        // Naviguer vers la page artisans
                        router.push("/artisans")
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-lg border bg-amber-50 border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-900">Dossiers à compléter</span>
                      </div>
                      <span className="text-sm font-semibold text-amber-700">{stats.dossiers_a_completer}</span>
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent 
                    className="w-96 z-50 max-h-[500px] overflow-y-auto" 
                    side="right"
                    align="start"
                    sideOffset={8}
                  >
                    <DossiersACompleterContent onOpenArtisan={openArtisanModal} />
                  </HoverCardContent>
                </HoverCard>
              )}
            </div>
          </CardContent>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => artisanModal.openNew()} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouveau Artisan
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

