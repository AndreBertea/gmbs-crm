"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { artisansApi } from "@/lib/api/v2"
import { supabase } from "@/lib/supabase-client"
import type { ArtisanStatsByStatus } from "@/lib/api/v2"
import { Loader2, FileText, Plus, Calendar, UserCheck, UserX } from "lucide-react"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getArtisanStatusStyles } from "@/config/status-colors"

interface ArtisanStatsBarChartProps {
  period?: {
    startDate?: string
    endDate?: string
  }
}

export function ArtisanStatsBarChart({ period }: ArtisanStatsBarChartProps) {
  const [stats, setStats] = useState<ArtisanStatsByStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [topArtisans, setTopArtisans] = useState<Array<{
    artisan_id: string;
    artisan_nom: string;
    artisan_prenom: string;
    total_interventions: number;
    derniere_intervention_date: string | null;
    is_available: boolean;
    absence_reason: string | null;
    absence_end_date: string | null;
  }>>([])
  const router = useRouter()
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

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

        // Pour les artisans, on charge la somme totale (sans restriction de période)
        // La période reste optionnelle pour une utilisation future si nécessaire
        const startDate = period?.startDate
        const endDate = period?.endDate

        // Charger les stats et les top artisans en parallèle
        // Si aucune période n'est fournie, on charge tous les artisans (startDate et endDate seront undefined)
        const [statsData, topArtisansData] = await Promise.all([
          artisansApi.getStatsByGestionnaire(userId, startDate, endDate),
          artisansApi.getTopArtisansByGestionnaire(userId).catch(() => [])
        ])

        if (!cancelled) {
          setStats(statsData)
          setTopArtisans(topArtisansData)
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

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Préparer les données pour la liste (statuts avec nombre > 0)
  const listItems = stats?.by_status_label
    ? Object.entries(stats.by_status_label)
        .map(([label, count]) => ({
          label,
          count,
        }))
        .filter((item) => item.count > 0)
        .sort((a, b) => b.count - a.count) // Trier par nombre décroissant
    : []

  if (loading) {
    return (
      <Card className="border-border/30 shadow-sm/50">
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
      <Card className="border-border/30 shadow-sm/50">
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
      <Card className="border-border/30 shadow-sm/50">
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
      <Card className="border-border/30 shadow-sm/50">
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Jamais"
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Popover modal={false} open={isMounted ? popoverOpen : false} onOpenChange={setPopoverOpen}>
          <PopoverTrigger 
            asChild
            onMouseEnter={() => setTimeout(() => setPopoverOpen(true), 150)}
            onMouseLeave={() => setTimeout(() => setPopoverOpen(false), 200)}
          >
            <Card 
              className="border-border/30 shadow-sm/50 cursor-pointer transition-shadow hover:shadow-md"
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
                  <button
                    key={item.label}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStatusClick(item.label)
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border ${statusStyles.bg} ${statusStyles.border} ${statusStyles.hover} transition-colors cursor-pointer border-l-4`}
                  >
                    <span className={`text-sm font-semibold ${statusStyles.text}`}>{item.label}</span>
                    <span className={`text-sm font-bold ${statusStyles.text}`}>{item.count}</span>
                  </button>
                )
              })}

              {/* Ligne pour les dossiers à compléter */}
              {stats && (stats.dossiers_a_completer ?? 0) > 0 && (
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
              )}
            </div>
          </CardContent>
        </Card>
          </PopoverTrigger>
          <PopoverContent 
            className="w-96 max-h-[500px] overflow-y-auto" 
            align="start"
            sideOffset={8}
          >
            <div 
              className="space-y-3"
              onMouseEnter={() => setPopoverOpen(true)}
              onMouseLeave={() => setPopoverOpen(false)}
            >
              <h4 className="font-semibold text-sm mb-2">Top 5 artisans (par nombre d'interventions)</h4>
              {topArtisans.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun artisan trouvé</p>
              ) : (
                <div className="space-y-2">
                  {topArtisans.map((artisan) => (
                    <div
                      key={artisan.artisan_id}
                      className="p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/artisans/${artisan.artisan_id}`)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold">
                              {artisan.artisan_prenom} {artisan.artisan_nom}
                            </span>
                            {artisan.is_available ? (
                              <div title="Disponible">
                                <UserCheck className="h-4 w-4 text-green-600" />
                              </div>
                            ) : (
                              <div title="Indisponible">
                                <UserX className="h-4 w-4 text-red-600" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <span>{artisan.total_interventions} intervention{artisan.total_interventions > 1 ? "s" : ""}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Dernière: {formatDate(artisan.derniere_intervention_date)}</span>
                            </div>
                          </div>
                          {!artisan.is_available && artisan.absence_reason && (
                            <div className="mt-1 text-xs text-red-600">
                              {artisan.absence_reason}
                              {artisan.absence_end_date && (
                                <span> jusqu'au {formatDate(artisan.absence_end_date)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem asChild>
          <Link href="/artisans/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nouveau Artisan
          </Link>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
