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

    // Vérifier si on modifie un objectif créé par un admin (et que l'utilisateur n'est pas admin)
    if (editingTarget && !canModifyTarget(editingTarget)) {
      toast({
        title: "Erreur",
        description: "Vous ne pouvez pas modifier un objectif créé par un administrateur",
        variant: "destructive",
      })
      return
    }

    try {
      const targetData: CreateGestionnaireTargetData = {
        user_id: formData.user_id,
        period_type: formData.period_type,
        margin_target: formData.margin_target,
        performance_target: formData.performance_target ?? 40, // Utiliser 40% par défaut si null
      }

      if (editingTarget) {
        await usersApi.updateTarget(editingTarget.id, targetData, currentUser.id)
        toast({
          title: "Succès",
          description: "Objectif mis à jour avec succès",
        })
      } else {
        await usersApi.upsertTarget(targetData, currentUser.id)
        toast({
          title: "Succès",
          description: "Objectif créé avec succès",
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

  // Grouper les objectifs par utilisateur (seulement pour les gestionnaires, pas les admins)
  const targetsByUser = gestionnaires.reduce((acc, user) => {
    acc[user.id] = {
      user,
      targets: targets.filter((t) => t.user_id === user.id),
    }
    return acc
  }, {} as Record<string, { user: User; targets: GestionnaireTarget[] }>)

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
          <div className="space-y-6">
            {Object.values(targetsByUser).map(({ user, targets: userTargets }) => (
              <div key={user.id} className="space-y-2">
                <h3 className="text-lg font-semibold">
                  {getUserName(user.id)} {user.code_gestionnaire && `(${user.code_gestionnaire})`}
                </h3>
                {userTargets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun objectif défini</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Période</TableHead>
                        <TableHead>Objectif de marge</TableHead>
                        <TableHead>Objectif de performance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userTargets.map((target) => (
                        <TableRow key={target.id}>
                          <TableCell className="font-medium">{getPeriodLabel(target.period_type)}</TableCell>
                          <TableCell>{formatCurrency(target.margin_target)}</TableCell>
                          <TableCell>
                            {target.performance_target !== null ? `${target.performance_target}%` : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {canModifyTarget(target) ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenDialog(target)}
                                    className="gap-2"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                    Modifier
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(target.id)}
                                    className="gap-2 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Supprimer
                                  </Button>
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Créé par un administrateur
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ))}
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
                  setFormData({
                    ...formData,
                    period_type: periodType,
                    // Mettre à jour margin_target avec la valeur par défaut si on crée un nouvel objectif
                    margin_target: editingTarget ? formData.margin_target : getDefaultMarginTarget(periodType),
                  })
                }}
                disabled={!!editingTarget}
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
                    performance_target: e.target.value ? parseFloat(e.target.value) : 40,
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

