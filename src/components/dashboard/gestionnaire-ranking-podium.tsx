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
      <Card>
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
      <Card>
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

  const top3 = ranking.rankings.slice(0, 3)
  // Pour le bottom 3, on prend les 3 derniers et on les inverse pour avoir l'ordre croissant
  const bottom3 = ranking.rankings.length >= 3 
    ? ranking.rankings.slice(-3) // Les 3 derniers dans l'ordre croissant
    : []

  // Emojis pour le top 3
  const top3Emojis = ["🥇", "🥈", "🥉"]
  const top3ExtraEmojis = ["🔥", "👑", "💪"]
  
  // Emojis pour le bottom 3 selon la position relative dans le tableau
  const totalRankings = ranking.rankings.length
  const getBottomEmoji = (rank: number) => {
    // Les 3 derniers rangs sont : totalRankings - 2, totalRankings - 1, totalRankings
    const lastRank = totalRankings
    const secondLastRank = totalRankings - 1
    const thirdLastRank = totalRankings - 2
    
    if (rank === thirdLastRank) return "🏌️‍♂️" // Avant-dernier avant-dernier
    if (rank === secondLastRank) return "🕯️" // Avant-dernier
    if (rank === lastRank) return "‼️" // Dernier
    return "📊" // Fallback
  }

  const renderRankingItem = (item: typeof ranking.rankings[0], isTop: boolean, index: number) => {
    const marginColor = item.total_margin >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
    const emoji = isTop 
      ? (index < 3 ? top3Emojis[index] : top3ExtraEmojis[(index - 3) % 3])
      : getBottomEmoji(item.rank)
    
    // Définir les couleurs pour les top 3 : or, argent, bronze
    let avatarBorderColor = ""
    let bgGradient = ""
    
    if (isTop && item.rank <= 3) {
      if (item.rank === 1) {
        // Or pour le premier
        avatarBorderColor = "#fbbf24" // amber-400
        bgGradient = "bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20"
      } else if (item.rank === 2) {
        // Argent pour le deuxième
        avatarBorderColor = "#94a3b8" // slate-400
        bgGradient = "bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/30 dark:to-slate-900/20"
      } else if (item.rank === 3) {
        // Bronze pour le troisième
        avatarBorderColor = "#cd7f32" // bronze
        bgGradient = "bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20"
      }
    } else {
      // Pour les autres, fond neutre
      bgGradient = "bg-muted/30"
      avatarBorderColor = "hsl(var(--border))"
    }

    return (
      <div
        key={item.user_id}
        className={`p-2 rounded-lg ${bgGradient} transition-all duration-200 hover:shadow-sm`}
      >
        {/* Première ligne : Avatar Code Marge Emoji */}
        <div className="flex items-center gap-2">
          {/* Avatar avec bordure or/argent/bronze */}
          <Avatar
            className="h-10 w-10 border-2 flex-shrink-0"
            style={{ 
              backgroundColor: item.user_color || undefined,
              borderColor: avatarBorderColor,
              borderWidth: (isTop && item.rank <= 3) ? "3px" : "2px"
            }}
          >
            <AvatarFallback className="text-xs font-semibold text-foreground">
              {getInitials(item.user_name)}
            </AvatarFallback>
          </Avatar>
          
          {/* Code du gestionnaire */}
          <div className="flex-1 min-w-0">
            {item.user_code ? (
              <p className="text-sm font-medium truncate text-foreground">{item.user_code}</p>
            ) : (
              <p className="text-sm font-medium truncate text-foreground">{item.user_name}</p>
            )}
          </div>
          
          {/* Marge et Emoji à droite */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <p className={`text-sm font-bold ${marginColor} whitespace-nowrap`}>
              {formatCurrency(item.total_margin)}
            </p>
            <span className="text-lg">{emoji}</span>
          </div>
        </div>
        
        {/* Deuxième ligne : Nb intervention */}
        <div className="mt-1 ml-12 text-xs text-muted-foreground">
          {item.total_interventions} intervention{item.total_interventions > 1 ? "s" : ""}
        </div>
      </div>
    )
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-bold">Podium</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Top 3 */}
        {top3.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🏆</span>
              <h3 className="text-sm font-semibold">Top 3</h3>
            </div>
            <div className="space-y-2">
              {top3.map((item, index) => (
                <div key={item.user_id} className="relative">
                  {renderRankingItem(item, true, index)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom 3 */}
        {bottom3.length > 0 && ranking.rankings.length > 3 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              <h3 className="text-sm font-semibold">Bottom 3</h3>
            </div>
            <div className="space-y-2">
              {bottom3.map((item, index) => (
                <div key={item.user_id} className="relative">
                  {renderRankingItem(item, false, index)}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

