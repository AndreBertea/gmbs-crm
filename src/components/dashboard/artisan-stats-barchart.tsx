"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { artisansApi } from "@/lib/api/v2"
import { supabase } from "@/lib/supabase-client"
import type { ArtisanStatsByStatus } from "@/lib/api/v2"
import { Loader2, FileText, Plus } from "lucide-react"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import Link from "next/link"
import { useRouter } from "next/navigation"

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
  }, [userId, period?.startDate, period?.endDate])

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
      <Card>
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
      <Card>
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
      <Card>
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
      <Card>
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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card>
          <CardHeader>
            <CardTitle>Mes Artisans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Liste des statuts */}
              {listItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-sm font-semibold text-muted-foreground">{item.count}</span>
                </div>
              ))}

              {/* Ligne pour les dossiers à compléter */}
              {(stats?.dossiers_a_completer ?? 0) > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // Stocker l'intention de filtre dans sessionStorage
                    sessionStorage.setItem('pending-artisan-filter', JSON.stringify({
                      viewId: "ma-liste-artisans", // Activer la vue "Ma liste artisans"
                      statusFilter: "Potentiel" // Activer le filtre de statut "Potentiel"
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
