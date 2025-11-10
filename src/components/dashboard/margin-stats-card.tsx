"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { interventionsApi } from "@/lib/api/v2"
import { supabase } from "@/lib/supabase-client"
import type { MarginStats } from "@/lib/api/v2"
import { Loader2, TrendingUp, TrendingDown } from "lucide-react"

interface MarginStatsCardProps {
  period?: {
    startDate?: string
    endDate?: string
  }
}

export function MarginStatsCard({ period }: MarginStatsCardProps) {
  const [stats, setStats] = useState<MarginStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

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

  // Charger les statistiques de marge une fois l'utilisateur chargé
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

        const statsData = await interventionsApi.getMarginStatsByUser(userId, startDate, endDate)

        if (!cancelled) {
          setStats(statsData)
          setLoading(false)
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Erreur lors du chargement des statistiques de marge")
          setLoading(false)
        }
      }
    }

    loadStats()

    return () => {
      cancelled = true
    }
  }, [userId, period?.startDate, period?.endDate])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Marge moyenne</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <div className="h-8 w-16 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Marge moyenne</CardTitle>
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
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Marge moyenne</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Veuillez vous connecter pour voir vos statistiques
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!stats || stats.total_interventions === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Marge moyenne</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">-</div>
          <p className="text-xs text-muted-foreground mt-1">
            Aucune intervention avec coûts
          </p>
        </CardContent>
      </Card>
    )
  }

  // Gérer les cas extrêmes de pourcentage
  const isExtreme = Math.abs(stats.average_margin_percentage) >= 1000
  const displayPercentage = isExtreme 
    ? (stats.average_margin_percentage < 0 ? "< -1000%" : "> 1000%")
    : `${stats.average_margin_percentage.toFixed(2)}%`
  
  const marginColor = stats.average_margin_percentage >= 0 ? "text-green-600" : "text-red-600"
  const TrendIcon = stats.average_margin_percentage >= 0 ? TrendingUp : TrendingDown

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">Marge moyenne</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <TrendIcon className={`h-5 w-5 ${marginColor}`} />
          <div className="text-2xl font-bold" style={{ color: stats.average_margin_percentage >= 0 ? 'rgb(22, 163, 74)' : 'rgb(220, 38, 38)' }}>
            {displayPercentage}
          </div>
        </div>
        {stats.period?.start_date && stats.period?.end_date && (
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(stats.period.start_date).toLocaleDateString("fr-FR")} -{" "}
            {new Date(stats.period.end_date).toLocaleDateString("fr-FR")}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {stats.total_interventions} intervention{stats.total_interventions > 1 ? "s" : ""}
        </p>
      </CardContent>
    </Card>
  )
}

