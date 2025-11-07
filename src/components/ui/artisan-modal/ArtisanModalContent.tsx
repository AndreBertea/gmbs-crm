"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Controller, useForm } from "react-hook-form"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ModeIcons } from "@/components/ui/mode-selector"
import { CommentSection } from "@/components/shared/CommentSection"
import { useReferenceData } from "@/hooks/useReferenceData"
import { useToast } from "@/hooks/use-toast"
import { artisansApiV2, type Artisan as ApiArtisan } from "@/lib/supabase-api-v2"
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"
import type { ModalDisplayMode } from "@/types/modal-display"

type ArtisanWithRelations = ApiArtisan & {
  artisan_metiers?: Array<{
    metier_id: string
    is_primary?: boolean | null
    metiers?: { id: string; code: string | null; label: string | null } | null
  }>
  artisan_zones?: Array<{
    zone_id: string
    zones?: { id: string; code: string | null; label: string | null } | null
  }>
  artisan_attachments?: Array<{
    id: string
    kind: string
    url: string
    filename: string | null
    created_at?: string | null
  }>
  artisan_absences?: Array<{
    id: string
    start_date: string | null
    end_date: string | null
    reason: string | null
    is_confirmed?: boolean | null
  }>
  commentHistories?: Array<{
    id: string
    comment?: string | null
    modifiedAt?: string | null
    created_at?: string | null
    user?: {
      username?: string | null
      firstname?: string | null
      lastname?: string | null
    } | null
  }>
  statutDossier?: string | null
}

type ArtisanFormValues = {
  raison_sociale: string
  prenom: string
  nom: string
  telephone: string
  telephone2: string
  email: string
  adresse_intervention: string
  code_postal_intervention: string
  ville_intervention: string
  adresse_siege_social: string
  code_postal_siege_social: string
  ville_siege_social: string
  statut_juridique: string
  siret: string
  metiers: string[]
  zone_intervention: string
  gestionnaire_id: string
  statut_id: string
  numero_associe: string
}

type Props = {
  artisanId: string
  mode: ModalDisplayMode
  onClose: () => void
  onNext?: () => void
  onPrevious?: () => void
  canNext?: boolean
  canPrevious?: boolean
  onCycleMode?: () => void
  activeIndex?: number
  totalCount?: number
}

const formatDate = (value: string | null | undefined, withTime = false) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  try {
    return new Intl.DateTimeFormat("fr-FR", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date)
  } catch {
    return value
  }
}

const dossierStatusTheme: Record<string, string> = {
  complet: "bg-emerald-100 text-emerald-700 border-emerald-200",
  en_attente: "bg-amber-100 text-amber-700 border-amber-200",
  incomplet: "bg-red-100 text-red-700 border-red-200",
  a_verifier: "bg-blue-100 text-blue-700 border-blue-200",
  bloque: "bg-slate-200 text-slate-700 border-slate-300",
}

const mapArtisanToForm = (artisan: ArtisanWithRelations): ArtisanFormValues => {
  const metierIds = Array.isArray(artisan.artisan_metiers)
    ? artisan.artisan_metiers
        .map((item) => item.metier_id || item.metiers?.id || item.metiers?.code || item.metiers?.label)
        .filter((value): value is string => Boolean(value))
    : Array.isArray(artisan.metiers)
      ? artisan.metiers.filter((value): value is string => Boolean(value))
      : []

  const zoneValue = (() => {
    if (Array.isArray(artisan.artisan_zones) && artisan.artisan_zones.length > 0) {
      const first = artisan.artisan_zones[0]
      return first.zone_id || first.zones?.code || first.zones?.label || ""
    }
    if (Array.isArray(artisan.zones) && artisan.zones.length > 0) {
      return String(artisan.zones[0] ?? "")
    }
    if (artisan.zoneIntervention) {
      return String(artisan.zoneIntervention)
    }
    return ""
  })()

  return {
    raison_sociale: artisan.raison_sociale ?? "",
    prenom: artisan.prenom ?? "",
    nom: artisan.nom ?? "",
    telephone: artisan.telephone ?? "",
    telephone2: artisan.telephone2 ?? "",
    email: artisan.email ?? "",
    adresse_intervention: artisan.adresse_intervention ?? "",
    code_postal_intervention: artisan.code_postal_intervention ?? "",
    ville_intervention: artisan.ville_intervention ?? "",
    adresse_siege_social: artisan.adresse_siege_social ?? "",
    code_postal_siege_social: artisan.code_postal_siege_social ?? "",
    ville_siege_social: artisan.ville_siege_social ?? "",
    statut_juridique: artisan.statut_juridique ?? "",
    siret: artisan.siret ?? "",
    metiers: metierIds,
    zone_intervention: zoneValue,
    gestionnaire_id: artisan.gestionnaire_id ?? "",
    statut_id: artisan.statut_id ?? "",
    numero_associe: artisan.numero_associe ?? "",
  }
}

const buildUpdatePayload = (values: ArtisanFormValues) => ({
  raison_sociale: values.raison_sociale || null,
  prenom: values.prenom || null,
  nom: values.nom || null,
  telephone: values.telephone || null,
  telephone2: values.telephone2 || null,
  email: values.email || null,
  adresse_intervention: values.adresse_intervention || null,
  code_postal_intervention: values.code_postal_intervention || null,
  ville_intervention: values.ville_intervention || null,
  adresse_siege_social: values.adresse_siege_social || null,
  code_postal_siege_social: values.code_postal_siege_social || null,
  ville_siege_social: values.ville_siege_social || null,
  statut_juridique: values.statut_juridique || null,
  siret: values.siret || null,
  zones: values.zone_intervention ? [values.zone_intervention] : [],
  metiers: values.metiers ?? [],
  gestionnaire_id: values.gestionnaire_id || null,
  statut_id: values.statut_id || null,
  numero_associe: values.numero_associe || null,
})

export function ArtisanModalContent({
  artisanId,
  mode,
  onClose,
  onNext,
  onPrevious,
  canNext,
  canPrevious,
  onCycleMode,
  activeIndex,
  totalCount,
}: Props) {
  const bodyPadding = mode === "fullpage" ? "px-8 py-6 md:px-12" : "px-5 py-4 md:px-8"
  const surfaceVariantClass = mode === "fullpage" ? "modal-config-surface-full" : undefined
  const surfaceModeClass = `modal-config--${mode}`
  const ModeIcon = ModeIcons[mode]

  const { data: referenceData } = useReferenceData()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const formRef = useRef<HTMLFormElement>(null)

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<ArtisanFormValues>({
    defaultValues: {
      raison_sociale: "",
      prenom: "",
      nom: "",
      telephone: "",
      telephone2: "",
      email: "",
      adresse_intervention: "",
      code_postal_intervention: "",
      ville_intervention: "",
      adresse_siege_social: "",
      code_postal_siege_social: "",
      ville_siege_social: "",
      statut_juridique: "",
      siret: "",
      metiers: [],
      zone_intervention: "",
      gestionnaire_id: "",
      statut_id: "",
      numero_associe: "",
    },
  })

  const {
    data: artisan,
    isLoading,
    error,
  } = useQuery<ArtisanWithRelations>({
    queryKey: ["artisan", artisanId],
    enabled: Boolean(artisanId),
    queryFn: async () =>
      (await artisansApiV2.getById(artisanId, [
        "statuses",
        "gestionnaires",
        "metiers",
        "zones",
        "attachments",
        "absences",
      ])) as ArtisanWithRelations,
  })

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadCurrentUser = async () => {
      try {
        const { data: session } = await supabase.auth.getSession()
        const token = session?.session?.access_token
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!response.ok) {
          throw new Error("Unable to load current user")
        }
        const payload = await response.json()
        if (!isMounted) return
        setCurrentUserId(payload?.user?.id ?? null)
      } catch (loadError) {
        console.warn("[ArtisanModalContent] Impossible de charger l'utilisateur courant", loadError)
      }
    }

    loadCurrentUser()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (artisan) {
      reset(mapArtisanToForm(artisan))
    }
  }, [artisan, reset])

  const updateArtisan = useMutation({
    mutationFn: (payload: ReturnType<typeof buildUpdatePayload>) => artisansApiV2.update(artisanId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["artisan", artisanId] })
      void queryClient.invalidateQueries({ queryKey: ["artisans"] })
    },
  })

  const onSubmit = (values: ArtisanFormValues) => {
    const payload = buildUpdatePayload(values)
    updateArtisan.mutate(payload, {
      onSuccess: () => {
        toast({
          title: "Artisan mis à jour",
          description: "Les informations de l'artisan ont été enregistrées.",
        })
        reset(values)
      },
      onError: (mutationError) => {
        const message = mutationError instanceof Error ? mutationError.message : "Une erreur est survenue."
        toast({
          title: "Échec de l'enregistrement",
          description: message,
          variant: "destructive",
        })
      },
    })
  }

  const displayName = useMemo(() => {
    if (!artisan) return "Artisan"
    const fromName = [artisan.prenom, artisan.nom].filter(Boolean).join(" ").trim()
    return fromName || (artisan as any)?.plain_nom || artisan.raison_sociale || "Artisan"
  }, [artisan])

  const companyName = artisan?.raison_sociale ?? null
  const dossierStatus = artisan?.statutDossier ?? null
  const dossierBadge = (() => {
    if (!dossierStatus) {
      return <Badge variant="outline">Non renseigné</Badge>
    }
    const slug = dossierStatus.toLowerCase().replace(/\s+/g, "_")
    const theme = dossierStatusTheme[slug] ?? "bg-slate-100 text-slate-700 border-slate-200"
    return (
      <Badge className={cn("border", theme)}>
        {dossierStatus}
      </Badge>
    )
  })()

  const absences = useMemo(() => {
    const raw = artisan?.artisan_absences ?? []
    if (!Array.isArray(raw)) return []
    return raw
      .filter((absence) => absence?.start_date || absence?.end_date)
      .map((absence) => ({
        id: absence.id ?? `${absence.start_date ?? ""}-${absence.end_date ?? ""}`,
        startDate: absence.start_date ?? null,
        endDate: absence.end_date ?? null,
        reason: absence.reason ?? null,
        isConfirmed: absence.is_confirmed ?? null,
      }))
  }, [artisan])

  const attachments = useMemo(() => {
    const raw = artisan?.artisan_attachments ?? []
    if (!Array.isArray(raw)) return []
    return raw
      .filter((attachment) => Boolean(attachment?.url))
      .map((attachment) => ({
        id: attachment.id,
        kind: attachment.kind ?? "document",
        filename: attachment.filename ?? attachment.kind ?? "Document",
        url: attachment.url,
        createdAt: attachment.created_at ?? null,
      }))
  }, [artisan])

  const metierOptions = useMemo(() => {
    const base = (referenceData?.metiers ?? []).map((metier) => ({
      id: metier.id,
      label: metier.label ?? metier.code ?? metier.id,
    }))

    const extraFromArtisan = (() => {
      if (Array.isArray(artisan?.artisan_metiers)) {
        return artisan.artisan_metiers
          .map((item) => {
            const id = item.metier_id || item.metiers?.id || item.metiers?.code || item.metiers?.label
            const label = item.metiers?.label || item.metiers?.code || item.metier_id
            if (!id) return null
            return { id, label: label ?? id }
          })
          .filter((value): value is { id: string; label: string } => Boolean(value))
      }
      if (Array.isArray(artisan?.metiers)) {
        return artisan.metiers
          .filter((value): value is string => Boolean(value))
          .map((value) => ({ id: value, label: value }))
      }
      return [] as Array<{ id: string; label: string }>
    })()

    const merged = [...base]
    extraFromArtisan.forEach((item) => {
      if (!merged.some((existing) => existing.id === item.id)) {
        merged.push(item)
      }
    })
    return merged
  }, [artisan, referenceData])

  const statusOptions = useMemo(
    () =>
      (referenceData?.artisanStatuses ?? []).map((status) => ({
        id: status.id,
        label: status.label ?? status.code ?? status.id,
      })),
    [referenceData],
  )

  const gestionnaireOptions = useMemo(
    () =>
      (referenceData?.users ?? []).map((user) => {
        const name = [user.firstname, user.lastname].filter(Boolean).join(" ").trim()
        return {
          id: user.id,
          label: name || user.username || user.id,
        }
      }),
    [referenceData],
  )

  const isSaving = updateArtisan.isPending
  const isWideMode = mode === "fullpage" || mode === "centerpage"

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-5">
          <div className="h-7 w-60 rounded bg-muted animate-pulse" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-32 rounded-lg bg-muted animate-pulse" />
            <div className="h-32 rounded-lg bg-muted animate-pulse" />
          </div>
          <div className="h-48 rounded-lg bg-muted animate-pulse" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="rounded border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {(error as Error).message}
        </div>
      )
    }

    if (!artisan) {
      return (
        <div className="rounded border border-muted bg-muted/20 p-4 text-sm text-muted-foreground">
          Artisan introuvable ou inaccessible.
        </div>
      )
    }

    const statusesContentClass = isWideMode ? "grid gap-4 md:grid-cols-2" : "space-y-4"

    return (
      <div className="space-y-6">
        <div className={isWideMode ? "grid gap-6 md:grid-cols-2" : "space-y-6"}>
          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Informations de l&apos;artisan</CardTitle>
                {companyName ? (
                  <p className="text-sm text-muted-foreground">{companyName}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase text-muted-foreground">Statut du dossier</span>
                {dossierBadge}
                {isDirty ? (
                  <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-700">
                    Modifications non enregistrées
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="raison_sociale">Raison Sociale</Label>
                  <Input id="raison_sociale" placeholder="Raison sociale" {...register("raison_sociale")} />
                </div>
                <div className="space-y-2">
                  <Label>Prénom Nom Artisan</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input id="prenom" placeholder="Prénom" {...register("prenom")} />
                    <Input id="nom" placeholder="Nom" {...register("nom")} />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input id="telephone" placeholder="06 12 34 56 78" {...register("telephone")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone2">Téléphone 2</Label>
                  <Input id="telephone2" placeholder="Optionnel" {...register("telephone2")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="artisan@example.com" {...register("email")} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="statut_juridique">Statut Juridique</Label>
                  <Input id="statut_juridique" placeholder="Ex. SAS, SARL..." {...register("statut_juridique")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siret">Siret</Label>
                  <Input id="siret" placeholder="000 000 000 00000" {...register("siret")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero_associe">Numéro associé</Label>
                <Input id="numero_associe" placeholder="Code interne" {...register("numero_associe")} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paramètres de l&apos;entreprise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Métiers</Label>
                <Controller
                  name="metiers"
                  control={control}
                  render={({ field }) => {
                    const selected = field.value ?? []
                    const toggleMetier = (id: string) => {
                      const next = new Set(selected)
                      if (next.has(id)) {
                        next.delete(id)
                      } else {
                        next.add(id)
                      }
                      field.onChange(Array.from(next))
                    }

                    const selectedLabels = metierOptions.filter((option) => selected.includes(option.id))

                    return (
                      <div className="space-y-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="outline" className="w-full justify-between">
                              <span>
                                {selected.length > 0
                                  ? `${selected.length} métier${selected.length > 1 ? "s" : ""} sélectionné${selected.length > 1 ? "s" : ""}`
                                  : "Sélectionner des métiers"}
                              </span>
                              <ChevronRight className="ml-2 h-4 w-4 opacity-60" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-64 max-h-64 overflow-y-auto">
                            {metierOptions.length ? (
                              metierOptions.map((option) => (
                                <DropdownMenuCheckboxItem
                                  key={option.id}
                                  checked={selected.includes(option.id)}
                                  onCheckedChange={() => toggleMetier(option.id)}
                                >
                                  {option.label}
                                </DropdownMenuCheckboxItem>
                              ))
                            ) : (
                              <DropdownMenuCheckboxItem disabled checked={false}>
                                Aucun métier disponible
                              </DropdownMenuCheckboxItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {selectedLabels.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedLabels.map((option) => (
                              <Badge
                                key={option.id}
                                variant="secondary"
                                className="flex items-center gap-1"
                              >
                                {option.label}
                                <button
                                  type="button"
                                  className="focus:outline-none"
                                  onClick={() => toggleMetier(option.id)}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zone_intervention">Zone d&apos;intervention (km)</Label>
                <Input
                  id="zone_intervention"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Rayon"
                  {...register("zone_intervention")}
                />
              </div>

              <div className="space-y-2">
                <Label>Adresse d&apos;intervention</Label>
                <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr]">
                  <Input id="adresse_intervention" placeholder="Adresse" {...register("adresse_intervention")} />
                  <Input id="code_postal_intervention" placeholder="Code postal" {...register("code_postal_intervention")} />
                  <Input id="ville_intervention" placeholder="Ville" {...register("ville_intervention")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Adresse du siège social</Label>
                <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr]">
                  <Input id="adresse_siege_social" placeholder="Adresse" {...register("adresse_siege_social")} />
                  <Input id="code_postal_siege_social" placeholder="Code postal" {...register("code_postal_siege_social")} />
                  <Input id="ville_siege_social" placeholder="Ville" {...register("ville_siege_social")} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gestion des absences</CardTitle>
            </CardHeader>
            <CardContent>
              {absences.length ? (
                <div className="space-y-3 text-sm">
                  {absences.map((absence) => (
                    <div
                      key={absence.id}
                      className="rounded-md border border-muted/60 bg-muted/20 p-3"
                    >
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatDate(absence.startDate)} → {formatDate(absence.endDate)}
                        </span>
                        {absence.isConfirmed ? (
                          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                            Confirmée
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                            Proposée
                          </Badge>
                        )}
                      </div>
                      {absence.reason ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Motif : {absence.reason}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucune absence enregistrée pour cet artisan.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Commentaires</CardTitle>
            </CardHeader>
            <CardContent>
              <CommentSection entityType="artisan" entityId={artisanId} currentUserId={currentUserId ?? undefined} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Suivi & Statuts</CardTitle>
            </CardHeader>
            <CardContent className={statusesContentClass}>
              <div className="space-y-2">
                <Label>Attribué à</Label>
                <Controller
                  name="gestionnaire_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un gestionnaire" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Non assigné</SelectItem>
                        {gestionnaireOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>Statut Artisan</Label>
                <Controller
                  name="statut_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Non défini</SelectItem>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.id} value={status.id}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents en pleine largeur en bas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Documents de l&apos;entreprise</CardTitle>
            <Badge variant="outline" className="text-xs">
              {attachments.length} document{attachments.length > 1 ? "s" : ""}
            </Badge>
          </CardHeader>
          <CardContent>
            {attachments.length ? (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex flex-col justify-between rounded border border-muted p-3"
                  >
                    <div>
                      <p className="font-medium text-sm truncate">{attachment.filename}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {attachment.kind}
                        {attachment.createdAt ? ` • ${formatDate(attachment.createdAt)}` : ""}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="mt-3 w-full" asChild>
                      <Link href={attachment.url} target="_blank" rel="noreferrer">
                        <FileText className="mr-2 h-4 w-4" />
                        Ouvrir
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun document disponible pour cet artisan.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={`modal-config-surface ${surfaceVariantClass ?? ""} ${surfaceModeClass}`}>
        <header className="modal-config-columns-header relative">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="modal-config-columns-icon-button"
                  onClick={onClose}
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="modal-config-columns-tooltip">Fermer (Esc)</TooltipContent>
            </Tooltip>

            {onCycleMode ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="modal-config-columns-icon-button"
                    onClick={onCycleMode}
                    aria-label="Changer le mode d'affichage"
                  >
                    <ModeIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="modal-config-columns-tooltip">
                  Ajuster l&apos;affichage ({mode})
                </TooltipContent>
              </Tooltip>
            ) : (
              <span className="modal-config-columns-icon-placeholder" />
            )}
          </div>

          <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
            <div className="modal-config-columns-title">
              {displayName}
              {activeIndex !== undefined && totalCount !== undefined && totalCount > 1 ? (
                <span className="ml-2 text-sm text-muted-foreground">
                  ({(activeIndex ?? 0) + 1} / {totalCount})
                </span>
              ) : null}
            </div>
            {companyName ? (
              <span className="text-xs text-muted-foreground">{companyName}</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="modal-config-columns-icon-button"
                  asChild
                  aria-label="Ouvrir la fiche complète"
                >
                  <Link href={`/artisans/${artisanId}`} prefetch={false}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="modal-config-columns-tooltip">
                Ouvrir la fiche complète (⌘⏎)
              </TooltipContent>
            </Tooltip>
            {onPrevious ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="modal-config-columns-icon-button"
                    onClick={onPrevious}
                    disabled={!canPrevious}
                    aria-label="Artisan précédent"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="modal-config-columns-tooltip">
                  Artisan précédent (Ctrl+Shift+K)
                </TooltipContent>
              </Tooltip>
            ) : null}
            {onNext ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="modal-config-columns-icon-button"
                    onClick={onNext}
                    disabled={!canNext}
                    aria-label="Artisan suivant"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="modal-config-columns-tooltip">
                  Artisan suivant (Ctrl+Shift+J)
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </header>
        <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <div className="modal-config-columns-body overflow-y-auto">
            <div className={cn(bodyPadding, "space-y-6")}>
              {renderContent()}
            </div>
          </div>
          <footer className="modal-config-columns-footer flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSaving || isLoading}>
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </footer>
        </form>
      </div>
    </TooltipProvider>
  )
}

export default ArtisanModalContent
