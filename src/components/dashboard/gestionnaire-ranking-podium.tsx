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
      <Card className="border-border/30 shadow-sm/50">
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
      <Card className="border-border/30 shadow-sm/50">
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
      <Card className="border-border/30 shadow-sm/50">
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
    const emoji = isTop 
      ? (index < 3 ? top3Emojis[index] : top3ExtraEmojis[(index - 3) % 3])
      : getBottomEmoji(item.rank)
    
    // Palettes de couleurs glorieuses pour le top 3
    let rankNumberStyle = ""
    let avatarBorderColor = ""
    let avatarBorderStyle = ""
    let bgGradient = ""
    let shadowStyle = ""
    let rankBadgeStyle = ""
    let marginColor = ""
    
    if (isTop && item.rank <= 3) {
      if (item.rank === 1) {
        // 🥇 OR - Palette glorieuse or/orange avec jaune très vif
        avatarBorderColor = "#facc15" // yellow-400 - jaune très vif
        avatarBorderStyle = "border-3 shadow-[0_0_20px_rgba(250,204,21,0.7),inset_0_0_20px_rgba(250,204,21,0.2)]"
        bgGradient = "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-orange-950/40"
        shadowStyle = "shadow-lg shadow-amber-500/30"
        rankBadgeStyle = "bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 text-white shadow-md shadow-yellow-500/40 ring-1 ring-yellow-300/40"
        marginColor = "text-yellow-500 dark:text-yellow-400 font-extrabold" // Jaune très vif pour la marge
      } else if (item.rank === 2) {
        // 🥈 ARGENT - Palette argentée élégante
        avatarBorderColor = "#94a3b8"
        avatarBorderStyle = "border-3 shadow-[0_0_15px_rgba(148,163,184,0.5),inset_0_0_15px_rgba(148,163,184,0.15)]"
        bgGradient = "bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-slate-950/35 dark:via-gray-950/25 dark:to-slate-950/35"
        shadowStyle = "shadow-md shadow-slate-400/25"
        rankBadgeStyle = "bg-gradient-to-br from-gray-300 via-slate-300 to-gray-400 text-white shadow-md shadow-slate-400/40 ring-1 ring-slate-200/40"
        marginColor = "text-slate-600 dark:text-slate-400" // Argent pour la marge
      } else if (item.rank === 3) {
        // 🥉 BRONZE - Palette bronze chaleureuse
        avatarBorderColor = "#cd7f32"
        avatarBorderStyle = "border-3 shadow-[0_0_12px_rgba(205,127,50,0.4),inset_0_0_12px_rgba(205,127,50,0.12)]"
        bgGradient = "bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 dark:from-orange-950/30 dark:via-amber-950/25 dark:to-orange-950/30"
        shadowStyle = "shadow-md shadow-orange-500/20"
        rankBadgeStyle = "bg-gradient-to-br from-orange-400 via-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/35 ring-1 ring-orange-300/40"
        marginColor = "text-orange-700 dark:text-orange-300" // Bronze pour la marge - similaire au nombre d'interventions
      }
    } else {
      // Pour les autres, fond neutre
      bgGradient = "bg-muted/30"
      avatarBorderColor = "hsl(var(--border))"
      avatarBorderStyle = "border-2"
      shadowStyle = ""
      rankBadgeStyle = "bg-muted text-muted-foreground"
      marginColor = item.total_margin >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
    }

    return (
      <div
        key={item.user_id}
        className={`relative p-3 rounded-xl ${bgGradient} ${shadowStyle} transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border border-opacity-20 ${
          item.rank === 1 ? "border-amber-300 dark:border-amber-700 animate-pulse-subtle" :
          item.rank === 2 ? "border-slate-300 dark:border-slate-700" :
          item.rank === 3 ? "border-orange-300 dark:border-orange-700" :
          "border-border"
        }`}
      >
        {/* Badge de rang stylisé en haut à gauche avec effet métallique - Plus petit */}
        {isTop && item.rank <= 3 && (
          <div className={`absolute -top-1.5 -left-1.5 w-7 h-7 rounded-full flex items-center justify-center ${rankBadgeStyle} z-10`}>
            {item.rank === 1 ? (
              // OR brillant avec effet de lumière
              <span className="text-white font-bold text-xs relative">
                <span className="absolute inset-0 text-yellow-200 blur-[1px] opacity-70">#{item.rank}</span>
                <span className="relative">#{item.rank}</span>
              </span>
            ) : item.rank === 2 ? (
              // ARGENT brillant
              <span className="text-white font-bold text-xs relative">
                <span className="absolute inset-0 text-gray-100 blur-[1px] opacity-60">#{item.rank}</span>
                <span className="relative">#{item.rank}</span>
              </span>
            ) : (
              // BRONZE brillant
              <span className="text-white font-bold text-xs relative">
                <span className="absolute inset-0 text-orange-200 blur-[1px] opacity-60">#{item.rank}</span>
                <span className="relative">#{item.rank}</span>
              </span>
            )}
          </div>
        )}
        
        {/* Première ligne : Avatar Code Marge Emoji */}
        <div className="flex items-center gap-2">
          {/* Avatar avec bordure or/argent/bronze stylisée */}
          <div className="relative">
            <Avatar
              className={`h-12 w-12 flex-shrink-0 ${avatarBorderStyle}`}
              style={{ 
                backgroundColor: item.user_color || undefined,
                borderColor: avatarBorderColor,
              }}
            >
              <AvatarFallback className="text-xs font-semibold text-foreground">
                {getInitials(item.user_name)}
              </AvatarFallback>
            </Avatar>
            {/* Effet de brillance sur l'avatar pour le top 3 */}
            {isTop && item.rank <= 3 && (
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent pointer-events-none" />
            )}
          </div>
          
          {/* Code du gestionnaire */}
          <div className="flex-1 min-w-0">
            {item.user_code ? (
              <p className={`text-sm font-semibold truncate ${
                item.rank === 1 ? "text-amber-900 dark:text-amber-200" :
                item.rank === 2 ? "text-slate-800 dark:text-slate-200" :
                item.rank === 3 ? "text-orange-900 dark:text-orange-200" :
                "text-foreground"
              }`}>
                {item.user_code}
              </p>
            ) : (
              <p className={`text-sm font-semibold truncate ${
                item.rank === 1 ? "text-amber-900 dark:text-amber-200" :
                item.rank === 2 ? "text-slate-800 dark:text-slate-200" :
                item.rank === 3 ? "text-orange-900 dark:text-orange-200" :
                "text-foreground"
              }`}>
                {item.user_name}
              </p>
            )}
          </div>
          
          {/* Marge et Emoji à droite */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <p className={`text-sm font-bold ${marginColor} whitespace-nowrap`}>
              {formatCurrency(item.total_margin)}
            </p>
            <span className="text-xl">{emoji}</span>
          </div>
        </div>
        
        {/* Deuxième ligne : Nb intervention */}
        <div className={`mt-2 ml-14 text-xs ${
          item.rank === 1 ? "text-amber-700 dark:text-amber-300" :
          item.rank === 2 ? "text-slate-600 dark:text-slate-400" :
          item.rank === 3 ? "text-orange-700 dark:text-orange-300" :
          "text-muted-foreground"
        }`}>
          {item.total_interventions} intervention{item.total_interventions > 1 ? "s" : ""}
        </div>
      </div>
    )
  }

  // Style personnalisé pour l'animation subtile du premier
  const pulseStyle = `
    @keyframes pulse-subtle {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.95; }
    }
    .animate-pulse-subtle {
      animation: pulse-subtle 3s ease-in-out infinite;
    }
  `

  return (
    <>
      <style>{pulseStyle}</style>
      <Card className="border-border/30 shadow-sm/50">
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
    </>
  )
}

