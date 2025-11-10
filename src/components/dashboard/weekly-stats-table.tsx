"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { interventionsApi } from "@/lib/api/v2"
import { supabase } from "@/lib/supabase-client"
import type { WeeklyStats, MonthlyStats, YearlyStats, StatsPeriod } from "@/lib/api/v2"
import { Loader2 } from "lucide-react"

interface WeeklyStatsTableProps {
  weekStartDate?: string
  period?: {
    startDate?: string
    endDate?: string
  }
}

// Helper pour déterminer le type de période à partir des dates
function getPeriodTypeFromDates(startDate?: string, endDate?: string): StatsPeriod {
  if (!startDate || !endDate) return "week"
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays <= 7) return "week"
  if (diffDays <= 35) return "month"
  return "year"
}

export function WeeklyStatsTable({ weekStartDate, period: externalPeriod }: WeeklyStatsTableProps) {
  // Si une période externe est fournie, utiliser son type, sinon semaine par défaut
  const [period, setPeriod] = useState<StatsPeriod>(
    externalPeriod ? getPeriodTypeFromDates(externalPeriod.startDate, externalPeriod.endDate) : "week"
  )
  
  // Mettre à jour la période si la période externe change
  useEffect(() => {
    if (externalPeriod) {
      const newPeriod = getPeriodTypeFromDates(externalPeriod.startDate, externalPeriod.endDate)
      setPeriod(newPeriod)
    }
  }, [externalPeriod?.startDate, externalPeriod?.endDate])
  const [stats, setStats] = useState<WeeklyStats | MonthlyStats | YearlyStats | null>(null)
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

  // Charger les statistiques selon la période choisie
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

        console.log(`[WeeklyStatsTable] Chargement stats pour userId: ${userId}, période: ${period}`)

        // Vérifier d'abord si l'utilisateur a des interventions (sans filtre de date)
        const { data: allInterventions } = await supabase
          .from("interventions")
          .select("id, date, assigned_user_id")
          .eq("assigned_user_id", userId)
          .eq("is_active", true)
          .limit(5)

        console.log(`[WeeklyStatsTable] Total interventions pour cet utilisateur (échantillon):`, allInterventions?.length || 0)
        if (allInterventions && allInterventions.length > 0) {
          console.log(`[WeeklyStatsTable] Exemples de dates:`, allInterventions.map(i => i.date))
        }

        // Utiliser la date de début de la période externe si disponible
        const startDateForQuery = externalPeriod?.startDate || (period === "week" ? weekStartDate : undefined)
        
        const statsData = await interventionsApi.getPeriodStatsByUser(
          userId,
          period,
          startDateForQuery
        )

        console.log(`[WeeklyStatsTable] Stats chargées:`, statsData)

        if (!cancelled) {
          setStats(statsData)
          setLoading(false)
        }
      } catch (err: any) {
        console.error(`[WeeklyStatsTable] Erreur:`, err)
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
  }, [userId, period, weekStartDate, externalPeriod?.startDate, externalPeriod?.endDate])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
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
          <CardTitle>Actions</CardTitle>
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
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Veuillez vous connecter pour voir vos statistiques
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Actions</CardTitle>
            {!externalPeriod && (
              <Select value={period} onValueChange={(value) => setPeriod(value as StatsPeriod)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Semaine</SelectItem>
                  <SelectItem value="month">Mois</SelectItem>
                  <SelectItem value="year">Année</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Aucune donnée disponible pour cette période.
            </p>
            <p className="text-xs text-muted-foreground">
              Vérifiez la console du navigateur (F12) pour voir les détails de debug.
            </p>
            <p className="text-xs text-muted-foreground">
              Possibles causes :
            </p>
            <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1 ml-2">
              <li>L'utilisateur n'a pas d'interventions assignées</li>
              <li>Les données sont en dehors de la période sélectionnée</li>
              <li>Les interventions n'ont pas les statuts recherchés (DEVIS_ENVOYE, INTER_EN_COURS, INTER_TERMINEE)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  }

  const formatMonthYear = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
  }

  // Rendu pour la semaine
  if (period === "week" && "week_start" in stats) {
    const weekStats = stats as WeeklyStats
    const rows = [
      { label: "Devis envoyé", data: weekStats.devis_envoye },
      { label: "Inter en cours", data: weekStats.inter_en_cours },
      { label: "Inter Facturés", data: weekStats.inter_factures },
      { label: "Nouveaux Artisans", data: weekStats.nouveaux_artisans },
    ]

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Actions de la semaine</CardTitle>
              <p className="text-sm text-muted-foreground">
                Semaine du {formatDate(weekStats.week_start)} au {formatDate(weekStats.week_end)}
              </p>
            </div>
            {!externalPeriod && (
              <Select value={period} onValueChange={(value) => setPeriod(value as StatsPeriod)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Semaine</SelectItem>
                  <SelectItem value="month">Mois</SelectItem>
                  <SelectItem value="year">Année</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Action</TableHead>
                  <TableHead className="text-center">Lundi</TableHead>
                  <TableHead className="text-center">Mardi</TableHead>
                  <TableHead className="text-center">Mercredi</TableHead>
                  <TableHead className="text-center">Jeudi</TableHead>
                  <TableHead className="text-center">Vendredi</TableHead>
                  <TableHead className="text-center font-bold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-center">{row.data.lundi}</TableCell>
                    <TableCell className="text-center">{row.data.mardi}</TableCell>
                    <TableCell className="text-center">{row.data.mercredi}</TableCell>
                    <TableCell className="text-center">{row.data.jeudi}</TableCell>
                    <TableCell className="text-center">{row.data.vendredi}</TableCell>
                    <TableCell className="text-center font-bold">{row.data.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Rendu pour le mois
  if (period === "month" && "month_start" in stats) {
    const monthStats = stats as MonthlyStats
    const rows = [
      { label: "Devis envoyé", data: monthStats.devis_envoye },
      { label: "Inter en cours", data: monthStats.inter_en_cours },
      { label: "Inter Facturés", data: monthStats.inter_factures },
      { label: "Nouveaux Artisans", data: monthStats.nouveaux_artisans },
    ]

    const monthNames = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
    const monthName = monthNames[monthStats.month - 1]

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Actions du mois</CardTitle>
              <p className="text-sm text-muted-foreground">
                {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {monthStats.year}
              </p>
            </div>
            {!externalPeriod && (
              <Select value={period} onValueChange={(value) => setPeriod(value as StatsPeriod)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Semaine</SelectItem>
                  <SelectItem value="month">Mois</SelectItem>
                  <SelectItem value="year">Année</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Action</TableHead>
                  <TableHead className="text-center">Semaine 1</TableHead>
                  <TableHead className="text-center">Semaine 2</TableHead>
                  <TableHead className="text-center">Semaine 3</TableHead>
                  <TableHead className="text-center">Semaine 4</TableHead>
                  <TableHead className="text-center">Semaine 5</TableHead>
                  <TableHead className="text-center font-bold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-center">{row.data.semaine1}</TableCell>
                    <TableCell className="text-center">{row.data.semaine2}</TableCell>
                    <TableCell className="text-center">{row.data.semaine3}</TableCell>
                    <TableCell className="text-center">{row.data.semaine4}</TableCell>
                    <TableCell className="text-center">{row.data.semaine5}</TableCell>
                    <TableCell className="text-center font-bold">{row.data.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Rendu pour l'année
  if (period === "year" && "year_start" in stats) {
    const yearStats = stats as YearlyStats
    const rows = [
      { label: "Devis envoyé", data: yearStats.devis_envoye },
      { label: "Inter en cours", data: yearStats.inter_en_cours },
      { label: "Inter Facturés", data: yearStats.inter_factures },
      { label: "Nouveaux Artisans", data: yearStats.nouveaux_artisans },
    ]

    const monthLabels = [
      "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
      "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ]

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Actions de l'année</CardTitle>
              <p className="text-sm text-muted-foreground">
                Année {yearStats.year}
              </p>
            </div>
            {!externalPeriod && (
              <Select value={period} onValueChange={(value) => setPeriod(value as StatsPeriod)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Semaine</SelectItem>
                  <SelectItem value="month">Mois</SelectItem>
                  <SelectItem value="year">Année</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Action</TableHead>
                  {monthLabels.map((month) => (
                    <TableHead key={month} className="text-center text-xs">
                      {month.slice(0, 3)}
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-bold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-center">{row.data.janvier}</TableCell>
                    <TableCell className="text-center">{row.data.fevrier}</TableCell>
                    <TableCell className="text-center">{row.data.mars}</TableCell>
                    <TableCell className="text-center">{row.data.avril}</TableCell>
                    <TableCell className="text-center">{row.data.mai}</TableCell>
                    <TableCell className="text-center">{row.data.juin}</TableCell>
                    <TableCell className="text-center">{row.data.juillet}</TableCell>
                    <TableCell className="text-center">{row.data.aout}</TableCell>
                    <TableCell className="text-center">{row.data.septembre}</TableCell>
                    <TableCell className="text-center">{row.data.octobre}</TableCell>
                    <TableCell className="text-center">{row.data.novembre}</TableCell>
                    <TableCell className="text-center">{row.data.decembre}</TableCell>
                    <TableCell className="text-center font-bold">{row.data.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
