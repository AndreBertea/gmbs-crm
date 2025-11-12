"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { usersApi } from "@/lib/api/v2"
import type { User, GestionnaireTarget, TargetPeriodType, CreateGestionnaireTargetData } from "@/lib/api/v2"
import { supabase } from "@/lib/supabase-client"
import { Loader2, Target, Edit2, Trash2, Plus } from "lucide-react"

export function TargetsSettings() {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [targets, setTargets] = useState<GestionnaireTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ id: string; roles: string[] } | null>(null)
  const [editingTarget, setEditingTarget] = useState<GestionnaireTarget | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [creatorUsers, setCreatorUsers] = useState<Map<string, User>>(new Map()) // Map des créateurs par ID
  const [formData, setFormData] = useState<{
    user_id: string
    period_type: TargetPeriodType
    margin_target: number
    performance_target: number | null
  }>({
    user_id: "",
    period_type: "month",
    margin_target: 5000, // Valeur par défaut pour le mois
    performance_target: 40, // Valeur par défaut de 40%
  })

  // Fonction helper pour obtenir la valeur par défaut de margin_target selon la période
  const getDefaultMarginTarget = (periodType: TargetPeriodType): number => {
    switch (periodType) {
      case "week":
        return 1500
      case "month":
        return 5000
      case "year":
        return 58000
      default:
        return 5000
    }
  }

  // Charger l'utilisateur actuel et vérifier les permissions
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const { data: session } = await supabase.auth.getSession()
        const token = session?.session?.access_token
        const res = await fetch("/api/auth/me", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const json = await res.json()
        const user = json?.user || null
        if (user) {
          setCurrentUser({ id: user.id, roles: user.roles || [] })
        }
      } catch (error) {
        console.error("Erreur lors du chargement de l'utilisateur:", error)
      }
    }
    loadCurrentUser()
  }, [])

  // Charger les utilisateurs et les objectifs
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return

      try {
        setLoading(true)
        // Charger tous les utilisateurs
        const usersResponse = await usersApi.getAll({ limit: 1000 })
        setUsers(usersResponse.data)

        // Charger tous les objectifs
        const allTargets = await usersApi.getAllTargets()
        setTargets(allTargets)

        // Charger les informations des créateurs des objectifs
        const creatorIds = new Set<string>()
        allTargets.forEach((target) => {
          if (target.created_by) {
            creatorIds.add(target.created_by)
          }
        })

        const creatorsMap = new Map<string, User>()
        for (const creatorId of creatorIds) {
          try {
            const creator = await usersApi.getById(creatorId)
            creatorsMap.set(creatorId, creator)
          } catch (error) {
            console.error(`Erreur lors du chargement du créateur ${creatorId}:`, error)
          }
        }
        setCreatorUsers(creatorsMap)
      } catch (error: any) {
        toast({
          title: "Erreur",
          description: error.message || "Erreur lors du chargement des données",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [currentUser, toast])

  // Vérifier si l'utilisateur est admin
  const isAdmin = currentUser?.roles?.some((role) => role.toLowerCase() === "admin") || false
  const isManager = currentUser?.roles?.some((role) => role.toLowerCase() === "manager") || false

  // Vérifier si un objectif a été créé par un admin
  const isTargetCreatedByAdmin = (target: GestionnaireTarget): boolean => {
    if (!target.created_by) return false
    const creator = creatorUsers.get(target.created_by)
    if (!creator) return false
    return creator.roles?.some((role) => role.toLowerCase() === "admin") || false
  }

  // Vérifier si l'utilisateur a les permissions (admin ou manager)
  const hasPermission = isAdmin || isManager

  // Vérifier si l'utilisateur peut modifier/supprimer un objectif
  const canModifyTarget = (target: GestionnaireTarget): boolean => {
    if (isAdmin) return true // Les admins peuvent tout modifier
    if (!isManager) return false // Seuls les admins et managers peuvent modifier
    // Les managers ne peuvent pas modifier les objectifs créés par les admins
    return !isTargetCreatedByAdmin(target)
  }

  if (!hasPermission) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accès refusé</CardTitle>
          <CardDescription>
            Vous n&apos;avez pas les permissions nécessaires pour gérer les objectifs de marge.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const handleOpenDialog = (target?: GestionnaireTarget) => {
    if (target) {
      setEditingTarget(target)
      setFormData({
        user_id: target.user_id,
        period_type: target.period_type,
        margin_target: target.margin_target,
        performance_target: target.performance_target ?? 40, // Utiliser 40% si null
      })
    } else {
      setEditingTarget(null)
      setFormData({
        user_id: "",
        period_type: "month",
        margin_target: getDefaultMarginTarget("month"),
        performance_target: 40,
      })
    }
    setIsDialogOpen(true)
  }


  const handleSave = async () => {
    if (!currentUser || !formData.user_id || formData.margin_target <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      })
      return
    }

    // Vérifier si un objectif existe déjà pour cette période et ce gestionnaire
    const existingTargetForPeriod = targets.find(
      (t) => t.user_id === formData.user_id && t.period_type === formData.period_type
    )

    // Si on modifie un objectif existant (même période ou changement de période)
    if (editingTarget) {
      // Vérifier si on peut modifier l'objectif original
      if (!canModifyTarget(editingTarget)) {
        toast({
          title: "Erreur",
          description: "Vous ne pouvez pas modifier un objectif créé par un administrateur",
          variant: "destructive",
        })
        return
      }

      // Si on change de période et qu'un objectif existe déjà pour la nouvelle période
      if (editingTarget.period_type !== formData.period_type && existingTargetForPeriod) {
        // Vérifier si on peut modifier l'objectif existant pour la nouvelle période
        if (!canModifyTarget(existingTargetForPeriod)) {
          toast({
            title: "Erreur",
            description: "Un objectif existe déjà pour cette période et vous n'avez pas les permissions pour le modifier",
            variant: "destructive",
          })
          return
        }
      }
    } else if (existingTargetForPeriod) {
      // Si on crée un nouvel objectif mais qu'un objectif existe déjà pour cette période
      if (!canModifyTarget(existingTargetForPeriod)) {
        toast({
          title: "Erreur",
          description: "Un objectif existe déjà pour cette période et vous n'avez pas les permissions pour le modifier",
          variant: "destructive",
        })
        return
      }
    }

    try {
      const targetData: CreateGestionnaireTargetData = {
        user_id: formData.user_id,
        period_type: formData.period_type,
        margin_target: formData.margin_target,
        performance_target: formData.performance_target ?? 40, // Utiliser 40% par défaut si null
      }

      // Si on modifie un objectif et qu'on ne change pas de période, utiliser updateTarget
      if (editingTarget && editingTarget.period_type === formData.period_type) {
        await usersApi.updateTarget(editingTarget.id, targetData, currentUser.id)
        toast({
          title: "Succès",
          description: "Objectif mis à jour avec succès",
        })
      } else {
        // Sinon, utiliser upsertTarget (gère création et mise à jour)
        await usersApi.upsertTarget(targetData, currentUser.id)
        toast({
          title: "Succès",
          description: existingTargetForPeriod ? "Objectif mis à jour avec succès" : "Objectif créé avec succès",
        })
      }

      // Recharger les objectifs
      const allTargets = await usersApi.getAllTargets()
      setTargets(allTargets)
      setIsDialogOpen(false)
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la sauvegarde",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (targetId: string) => {
    const target = targets.find((t) => t.id === targetId)
    if (!target) return

    // Vérifier si l'objectif a été créé par un admin (et que l'utilisateur n'est pas admin)
    if (!canModifyTarget(target)) {
      toast({
        title: "Erreur",
        description: "Vous ne pouvez pas supprimer un objectif créé par un administrateur",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Êtes-vous sûr de vouloir supprimer cet objectif ?")) {
      return
    }

    try {
      await usersApi.deleteTarget(targetId)
      toast({
        title: "Succès",
        description: "Objectif supprimé avec succès",
      })

      // Recharger les objectifs
      const allTargets = await usersApi.getAllTargets()
      setTargets(allTargets)
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression",
        variant: "destructive",
      })
    }
  }

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return "Utilisateur inconnu"
    return `${user.firstname || ""} ${user.lastname || ""}`.trim() || user.username || user.email || "Utilisateur"
  }

  const getPeriodLabel = (period: TargetPeriodType) => {
    switch (period) {
      case "week":
        return "Semaine"
      case "month":
        return "Mois"
      case "year":
        return "Année"
      default:
        return period
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Filtrer les utilisateurs pour exclure l'utilisateur avec le username "admin"
  const gestionnaires = users.filter((user) => {
    // Exclure uniquement l'utilisateur dont le username est "admin"
    return user.username?.toLowerCase() !== "admin"
  })

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Objectifs de marge
              </CardTitle>
              <CardDescription>
                Configurez les objectifs de marge et de performance pour chaque gestionnaire par période (semaine,
                mois, année).
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvel objectif
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto scrollbar-hide">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 dark:bg-muted/30 border-b-2 border-border/60 hover:bg-transparent h-14">
                  <TableHead className="w-[200px] font-bold text-foreground">Gestionnaire</TableHead>
                  {/* Colonnes Semaine */}
                  <TableHead colSpan={2} className="text-center font-bold text-foreground border-x border-border/40">
                    <div className="flex items-center justify-center w-full">Semaine</div>
                  </TableHead>
                  {/* Colonnes Mois */}
                  <TableHead colSpan={2} className="text-center font-bold text-foreground border-x border-border/40">
                    <div className="flex items-center justify-center w-full">Mois</div>
                  </TableHead>
                  {/* Colonnes Année */}
                  <TableHead colSpan={2} className="text-center font-bold text-foreground border-x border-border/40">
                    <div className="flex items-center justify-center w-full">Année</div>
                  </TableHead>
                  <TableHead className="text-right font-bold text-foreground min-w-[100px]">Actions</TableHead>
                </TableRow>
                <TableRow className="bg-muted/30 dark:bg-muted/20 border-b border-border/40 hover:bg-transparent">
                  <TableHead className="font-semibold"></TableHead>
                  {/* Sous-colonnes pour Semaine */}
                  <TableHead className="text-center font-semibold text-sm border-x border-border/40">
                    <div className="flex items-center justify-center w-full">Objectif Marge</div>
                  </TableHead>
                  <TableHead className="text-center font-semibold text-sm border-x border-border/40">
                    <div className="flex items-center justify-center w-full">Objectif Pourcentage</div>
                  </TableHead>
                  {/* Sous-colonnes pour Mois */}
                  <TableHead className="text-center font-semibold text-sm border-x border-border/40">
                    <div className="flex items-center justify-center w-full">Objectif Marge</div>
                  </TableHead>
                  <TableHead className="text-center font-semibold text-sm border-x border-border/40">
                    <div className="flex items-center justify-center w-full">Objectif Pourcentage</div>
                  </TableHead>
                  {/* Sous-colonnes pour Année */}
                  <TableHead className="text-center font-semibold text-sm border-x border-border/40">
                    <div className="flex items-center justify-center w-full">Objectif Marge</div>
                  </TableHead>
                  <TableHead className="text-center font-semibold text-sm border-x border-border/40">
                    <div className="flex items-center justify-center w-full">Objectif Pourcentage</div>
                  </TableHead>
                  <TableHead className="text-right font-semibold"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gestionnaires.map((user) => {
                  const weekTarget = targets.find((t) => t.user_id === user.id && t.period_type === "week")
                  const monthTarget = targets.find((t) => t.user_id === user.id && t.period_type === "month")
                  const yearTarget = targets.find((t) => t.user_id === user.id && t.period_type === "year")

                  const getUserDisplayName = () => {
                    const name = getUserName(user.id)
                    return user.code_gestionnaire ? `${name} (${user.code_gestionnaire})` : name
                  }

                  return (
                    <TableRow key={user.id} className="hover:bg-muted/50 transition-colors duration-200 border-b border-border/30">
                      <TableCell className="font-medium py-4">
                        {getUserDisplayName()}
                      </TableCell>
                      {/* Cellules Semaine */}
                      <TableCell className="text-center py-4 border-x border-border/40">
                        {weekTarget ? formatCurrency(weekTarget.margin_target) : "—"}
                      </TableCell>
                      <TableCell className="text-center py-4 border-x border-border/40">
                        {weekTarget?.performance_target !== null && weekTarget?.performance_target !== undefined
                          ? `${weekTarget.performance_target}%`
                          : "—"}
                      </TableCell>
                      {/* Cellules Mois */}
                      <TableCell className="text-center py-4 border-x border-border/40">
                        {monthTarget ? formatCurrency(monthTarget.margin_target) : "—"}
                      </TableCell>
                      <TableCell className="text-center py-4 border-x border-border/40">
                        {monthTarget?.performance_target !== null && monthTarget?.performance_target !== undefined
                          ? `${monthTarget.performance_target}%`
                          : "—"}
                      </TableCell>
                      {/* Cellules Année */}
                      <TableCell className="text-center py-4 border-x border-border/40">
                        {yearTarget ? formatCurrency(yearTarget.margin_target) : "—"}
                      </TableCell>
                      <TableCell className="text-center py-4 border-x border-border/40">
                        {yearTarget?.performance_target !== null && yearTarget?.performance_target !== undefined
                          ? `${yearTarget.performance_target}%`
                          : "—"}
                      </TableCell>
                      {/* Actions */}
                      <TableCell className="text-right py-4">
                        <div className="flex justify-end">
                          {/* Trouver le premier objectif modifiable ou utiliser le premier objectif existant */}
                          {(() => {
                            const modifiableTarget = [weekTarget, monthTarget, yearTarget].find(
                              (target) => target && canModifyTarget(target)
                            )
                            const anyTarget = weekTarget || monthTarget || yearTarget
                            
                            // Si l'utilisateur a au moins un objectif modifiable, on ouvre avec celui-ci
                            // Sinon, on ouvre en mode création avec le gestionnaire pré-sélectionné
                            if (modifiableTarget) {
                              return (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDialog(modifiableTarget)}
                                  className="gap-1 h-8"
                                  title="Modifier les objectifs"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              )
                            } else if (anyTarget) {
                              // Objectif existe mais créé par admin, on ne peut pas modifier
                              return (
                                <span className="text-xs text-muted-foreground" title="Créé par un administrateur">
                                  —
                                </span>
                              )
                            } else {
                              // Aucun objectif, on ouvre en mode création
                              return (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setFormData({
                                      user_id: user.id,
                                      period_type: "month",
                                      margin_target: getDefaultMarginTarget("month"),
                                      performance_target: 40,
                                    })
                                    setEditingTarget(null)
                                    setIsDialogOpen(true)
                                  }}
                                  className="gap-1 h-8"
                                  title="Créer un objectif"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )
                            }
                          })()}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTarget ? "Modifier l'objectif" : "Nouvel objectif"}</DialogTitle>
            <DialogDescription>
              Définissez l&apos;objectif de marge et de performance pour un gestionnaire sur une période donnée.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user_id">Gestionnaire *</Label>
              <Select
                value={formData.user_id}
                onValueChange={(value) => setFormData({ ...formData, user_id: value })}
                disabled={!!editingTarget}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un gestionnaire" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {gestionnaires.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {getUserName(user.id)} {user.code_gestionnaire && `(${user.code_gestionnaire})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="period_type">Période *</Label>
              <Select
                value={formData.period_type}
                onValueChange={(value) => {
                  const periodType = value as TargetPeriodType
                  // Si on change de période, charger les valeurs existantes pour cette période si elles existent
                  const existingTarget = targets.find(
                    (t) => t.user_id === formData.user_id && t.period_type === periodType
                  )
                  
                  if (existingTarget) {
                    // Si un objectif existe pour cette période, charger ses valeurs
                    setFormData({
                      ...formData,
                      period_type: periodType,
                      margin_target: existingTarget.margin_target,
                      performance_target: existingTarget.performance_target ?? 40,
                    })
                    setEditingTarget(existingTarget)
                  } else {
                    // Sinon, utiliser les valeurs par défaut pour cette période
                    setFormData({
                      ...formData,
                      period_type: periodType,
                      margin_target: getDefaultMarginTarget(periodType),
                      performance_target: 40,
                    })
                    setEditingTarget(null)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Semaine</SelectItem>
                  <SelectItem value="month">Mois</SelectItem>
                  <SelectItem value="year">Année</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="margin_target">Objectif de marge (€) *</Label>
              <Input
                id="margin_target"
                type="number"
                min="0"
                step="100"
                value={formData.margin_target}
                onChange={(e) => setFormData({ ...formData, margin_target: parseFloat(e.target.value) || 0 })}
                placeholder="10000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="performance_target">Objectif de performance (%)</Label>
              <Input
                id="performance_target"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.performance_target ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    performance_target: e.target.value === "" ? null : (parseFloat(e.target.value) || null),
                  })
                }
                placeholder="40"
              />
              <p className="text-xs text-muted-foreground">Pourcentage de marge cible (défaut: 40%)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

