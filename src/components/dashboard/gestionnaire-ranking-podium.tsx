"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { interventionsApi } from "@/lib/api/v2"
import type { MarginRankingResult } from "@/lib/api/v2"
import { Loader2, TrendingUp, TrendingDown } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface GestionnaireRankingPodiumProps {
  period?: {
    startDate?: string
    endDate?: string
  }
}

export function GestionnaireRankingPodium({ period }: GestionnaireRankingPodiumProps) {
  const [ranking, setRanking] = useState<MarginRankingResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadRanking = async () => {
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

        const rankingData = await interventionsApi.getMarginRankingByPeriod(startDate, endDate)

        if (!cancelled) {
          setRanking(rankingData)
          setLoading(false)
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Erreur lors du chargement du classement")
          setLoading(false)
        }
      }
    }

    loadRanking()

    return () => {
      cancelled = true
    }
  }, [period?.startDate, period?.endDate])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getInitials = (name: string) => {
    const parts = name.split(" ").filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Classement des gestionnaires</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
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
          <CardTitle>Classement des gestionnaires</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!ranking || ranking.rankings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Classement des gestionnaires</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucun gestionnaire avec des interventions sur cette période
          </p>
        </CardContent>
      </Card>
    )
  }

  const top3 = ranking.rankings.slice(0, 3)
  const bottom3 = ranking.rankings.length >= 3 
    ? ranking.rankings.slice(-3) // Les 3 derniers dans l'ordre croissant (8, 9, 10)
    : []

  const renderRankingItem = (item: typeof ranking.rankings[0], isTop: boolean) => {
    const marginColor = item.total_margin >= 0 ? "text-green-600" : "text-red-600"
    
    return (
      <div
        key={item.user_id}
        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
          isTop 
            ? "bg-green-50 border-green-200 hover:bg-green-100" 
            : "bg-red-50 border-red-200 hover:bg-red-100"
        }`}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${
            isTop ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {item.rank}
          </div>
          <Avatar
            className="h-10 w-10 border-2"
            style={{ 
              backgroundColor: item.user_color || undefined,
              borderColor: isTop ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"
            }}
          >
            <AvatarFallback className="text-xs font-semibold">
              {getInitials(item.user_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{item.user_name}</p>
            {item.user_code && (
              <p className="text-xs text-muted-foreground">{item.user_code}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            {isTop ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <p className={`text-base font-bold ${marginColor}`}>
              {formatCurrency(item.total_margin)}
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {item.total_interventions} intervention{item.total_interventions > 1 ? "s" : ""}
          </p>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Classement des gestionnaires</CardTitle>
        {ranking.period?.start_date && ranking.period?.end_date && (
          <p className="text-sm text-muted-foreground">
            Période: {new Date(ranking.period.start_date).toLocaleDateString("fr-FR")} -{" "}
            {new Date(ranking.period.end_date).toLocaleDateString("fr-FR")}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top 3 */}
        {top3.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h3 className="text-sm font-semibold text-green-700">Top 3 - Meilleurs gestionnaires</h3>
            </div>
            <div className="space-y-2">
              {top3.map((item) => renderRankingItem(item, true))}
            </div>
          </div>
        )}

        {/* Bottom 3 */}
        {bottom3.length > 0 && ranking.rankings.length > 3 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <h3 className="text-sm font-semibold text-red-700">Bottom 3 - À améliorer</h3>
            </div>
            <div className="space-y-2">
              {bottom3.map((item) => renderRankingItem(item, false))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

