"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { interventionsApi } from "@/lib/api/v2"
import type { MarginRankingResult } from "@/lib/api/v2"
import { Loader2, Trophy } from "lucide-react"
import { PodiumCard } from "@/components/dashboard/leaderboard/PodiumCard"
import { BottomCard } from "@/components/dashboard/leaderboard/BottomCard"

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

  // IMPORTANT: useMemo doit être appelé AVANT les early returns pour respecter les règles des Hooks
  const sortedRankings = useMemo(() => {
    if (!ranking || ranking.rankings.length === 0) {
      return []
    }
    return [...ranking.rankings].sort((a, b) => b.total_margin - a.total_margin)
  }, [ranking])

  const top3 = sortedRankings.slice(0, 3)
  const bottom3 = sortedRankings.length > 3 ? sortedRankings.slice(-3) : []
  const totalRankings = sortedRankings.length

  if (loading) {
    return (
      <Card className="bg-background border-border/5 shadow-sm/30">
        <CardHeader>
          <CardTitle>Podium</CardTitle>
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
      <Card className="bg-background border-border/5 shadow-sm/30">
        <CardHeader>
          <CardTitle>Podium</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!ranking || ranking.rankings.length === 0) {
    return (
      <Card className="bg-background border-border/5 shadow-sm/30">
        <CardHeader>
          <CardTitle>Podium</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucun gestionnaire avec des interventions sur cette période
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-background border-border/5 shadow-sm/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-center gap-3">
          <Trophy className="w-6 h-6 text-gold" />
          <CardTitle className="text-xl font-bold">Podium</CardTitle>
          <Trophy className="w-6 h-6 text-gold" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Podium - Top 3 */}
        {top3.length > 0 && (
          <div className="relative">
            <div className="flex items-end justify-center gap-2 md:gap-4 pt-12">
              {top3[1] && <PodiumCard entry={top3[1]} position={2} />}
              {top3[0] && <PodiumCard entry={top3[0]} position={1} />}
              {top3[2] && <PodiumCard entry={top3[2]} position={3} />}
            </div>
          </div>
        )}

        {/* Bottom 3 */}
        {bottom3.length > 0 && totalRankings > 3 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground text-center">
              Reste du classement
            </h2>
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              {bottom3.map((entry) => (
                <BottomCard
                  key={entry.user_id}
                  entry={entry}
                  position={entry.rank}
                  totalRankings={totalRankings}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

