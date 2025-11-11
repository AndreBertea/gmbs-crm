"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { interventionsApi, usersApi } from "@/lib/api/v2"
import type { MarginStats, TargetPeriodType } from "@/lib/api/v2"
import { Loader2 } from "lucide-react"
import { Speedometer } from "./speedometer"
import { useCurrentUser } from "@/hooks/useCurrentUser"

interface MarginTotalCardProps {
    period?: {
        startDate?: string
        endDate?: string
    }
}

// Objectif par défaut si aucun objectif n'est défini
const DEFAULT_TARGET = 10000 // 10 000 € par défaut

// Helper pour déterminer le type de période à partir des dates
function getPeriodTypeFromDates(startDate?: string, endDate?: string): TargetPeriodType {
    if (!startDate || !endDate) return "month"
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 7) return "week"
    if (diffDays <= 35) return "month"
    return "year"
}

export function MarginTotalCard({ period }: MarginTotalCardProps) {
    const [stats, setStats] = useState<MarginStats | null>(null)
    const [marginTarget, setMarginTarget] = useState<number>(DEFAULT_TARGET)
    const [showPercentage, setShowPercentage] = useState<boolean>(true)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Déterminer le type de période
    const periodType = useMemo(() => {
        return getPeriodTypeFromDates(period?.startDate, period?.endDate)
    }, [period?.startDate, period?.endDate])

    // Utiliser le hook React Query pour charger l'utilisateur (cache partagé)
    const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser()
    const userId = currentUser?.id ?? null

    // Charger l'objectif et les préférences pour l'utilisateur et la période
    useEffect(() => {
        if (!userId || isLoadingUser) return

        let cancelled = false

        const loadTargetAndPreferences = async () => {
            try {
                const [targetData, preferences] = await Promise.all([
                    usersApi.getTargetByUserAndPeriod(userId, periodType),
                    usersApi.getUserPreferences(userId),
                ])
                
                if (!cancelled) {
                    setMarginTarget(targetData?.margin_target || DEFAULT_TARGET)
                    setShowPercentage(preferences?.speedometer_margin_total_show_percentage ?? true)
                }
            } catch (err: any) {
                // Si erreur, utiliser les valeurs par défaut
                if (!cancelled) {
                    setMarginTarget(DEFAULT_TARGET)
                    setShowPercentage(true)
                }
            }
        }

        loadTargetAndPreferences()

        return () => {
            cancelled = true
        }
    }, [userId, isLoadingUser, periodType])

    // Charger les statistiques de marge une fois l'utilisateur chargé
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
    }, [userId, isLoadingUser, period?.startDate, period?.endDate])

    if (loading) {
        return (
            <Card className="border-border/30 shadow-sm/50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Marge totale</CardTitle>
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
            <Card className="border-border/30 shadow-sm/50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Marge totale</CardTitle>
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
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Marge totale</CardTitle>
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
            <Card className="border-border/30 shadow-sm/50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Marge totale</CardTitle>
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

    const formatCurrency = (amount: number) => {
        const absAmount = Math.abs(amount)
        const formatted = new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(absAmount)
        return amount < 0 ? `-${formatted}` : formatted
    }

    // Calculer le pourcentage de l'objectif
    const percentage = marginTarget > 0 
        ? Math.min(Math.abs(stats.total_margin) / marginTarget * 100, 100)
        : 0
    
    // Calculer le pourcentage réel affiché dans le speedometer
    const speedometerPercentage = Math.min(Math.max(percentage, 0), 100)
    
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
        <Card className="border-border/30 shadow-sm/50">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Marge totale</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Cadran de vitesse */}
                    <div className="flex justify-center">
                        <Speedometer
                            value={Math.abs(stats.total_margin)}
                            max={marginTarget}
                            size={140}
                            strokeWidth={14}
                            label={`${formatCurrency(stats.total_margin)}`}
                            showPercentage={showPercentage}
                            onContextMenu={async (e) => {
                                e.preventDefault()
                                const newValue = !showPercentage
                                setShowPercentage(newValue)
                                if (userId) {
                                    try {
                                        await usersApi.updateUserPreferences(userId, {
                                            speedometer_margin_total_show_percentage: newValue,
                                        })
                                    } catch (err) {
                                        console.error("Erreur lors de la mise à jour des préférences:", err)
                                        // Revert on error
                                        setShowPercentage(!newValue)
                                    }
                                }
                            }}
                        />
                    </div>

                    {/* Informations */}
                    <div className="space-y-1 mt-2">
                        <div className="flex items-center justify-between">
                            <div className="flex-1"></div>
                            <div className={`text-sm font-semibold ${percentageColor}`}>
                                {formatCurrency(stats.total_margin)}
                            </div>
                            <div className="flex-1 flex justify-end">
                                <div className="text-[10px] text-muted-foreground font-light tracking-wide">
                                    Objectif: {formatCurrency(marginTarget)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
