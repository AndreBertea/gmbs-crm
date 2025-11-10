"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { interventionsApi } from "@/lib/api/v2"
import { supabase } from "@/lib/supabase-client"
import type { MarginStats } from "@/lib/api/v2"
import { Loader2, TrendingUp, TrendingDown } from "lucide-react"
import { Speedometer } from "./speedometer"

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
  
  const TrendIcon = stats.average_margin_percentage >= 0 ? TrendingUp : TrendingDown
  
  // Calculer le pourcentage réel affiché dans le speedometer (basé sur max=100)
  const speedometerPercentage = Math.min(Math.max(Math.abs(stats.average_margin_percentage), 0), 100)
  
  // Déterminer la couleur basée sur le pourcentage du speedometer (cohérent avec l'aiguille)
  const getPercentageColor = () => {
    if (speedometerPercentage >= 95) return "text-purple-500 dark:text-purple-400"
    if (speedometerPercentage >= 90) return "text-green-600 dark:text-green-400"
    if (speedometerPercentage >= 75) return "text-green-600 dark:text-green-400"
    if (speedometerPercentage >= 50) return "text-yellow-600 dark:text-yellow-400"
    if (speedometerPercentage >= 25) return "text-orange-600 dark:text-orange-400"
    return "text-red-600 dark:text-red-400"
  }
  
  const percentageColor = getPercentageColor()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">Marge moyenne</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Cadran de vitesse */}
          <div className="flex justify-center">
            <Speedometer
              value={Math.abs(stats.average_margin_percentage)}
              max={100}
              size={140}
              strokeWidth={14}
              label={displayPercentage}
            />
          </div>

          {/* Informations */}
          <div className="space-y-1 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex-1"></div>
              <div className="flex items-center gap-2">
                <TrendIcon className={`h-4 w-4 ${percentageColor}`} />
                <div className={`text-lg font-bold ${percentageColor}`}>
                  {displayPercentage}
                </div>
              </div>
              <div className="flex-1 flex justify-end">
                <div className="text-[10px] text-muted-foreground font-light tracking-wide">
                  Objectif: 100%
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

