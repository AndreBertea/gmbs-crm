"use client"

import React, { useMemo, useRef } from "react"
import { Controller, useForm } from "react-hook-form"
import { useMutation } from "@tanstack/react-query"
import { ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ModeIcons } from "@/components/ui/mode-selector"
import { useReferenceData } from "@/hooks/useReferenceData"
import { useToast } from "@/hooks/use-toast"
import { artisansApiV2 } from "@/lib/supabase-api-v2"
import { cn } from "@/lib/utils"
import type { ModalDisplayMode } from "@/types/modal-display"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"

type NewArtisanFormValues = {
  prenom: string
  nom: string
  raison_sociale: string
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

const buildDefaultFormValues = (): NewArtisanFormValues => ({
  prenom: "",
  nom: "",
  raison_sociale: "",
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
})

const buildCreatePayload = (values: NewArtisanFormValues) => ({
  prenom: values.prenom || undefined,
  nom: values.nom || undefined,
  raison_sociale: values.raison_sociale || undefined,
  telephone: values.telephone || undefined,
  telephone2: values.telephone2 || undefined,
  email: values.email || undefined,
  adresse_intervention: values.adresse_intervention || undefined,
  code_postal_intervention: values.code_postal_intervention || undefined,
  ville_intervention: values.ville_intervention || undefined,
  adresse_siege_social: values.adresse_siege_social || undefined,
  code_postal_siege_social: values.code_postal_siege_social || undefined,
  ville_siege_social: values.ville_siege_social || undefined,
  statut_juridique: values.statut_juridique || undefined,
  siret: values.siret || undefined,
  metiers: (values.metiers ?? []).filter(Boolean),
  zones: values.zone_intervention ? [values.zone_intervention] : [],
  gestionnaire_id: values.gestionnaire_id || undefined,
  statut_id: values.statut_id || undefined,
  numero_associe: values.numero_associe || undefined,
})

type Props = {
  mode: ModalDisplayMode
  onClose: () => void
  onCycleMode?: () => void
}

export function NewArtisanModalContent({ mode, onClose, onCycleMode }: Props) {
  const ModeIcon = ModeIcons[mode]
  const { data: referenceData, loading: referenceLoading } = useReferenceData()
  const { toast } = useToast()
  const formRef = useRef<HTMLFormElement>(null)

  // Trouver le statut CANDIDAT par défaut
  const defaultCandidatStatusId = useMemo(() => {
    return referenceData?.artisanStatuses?.find(
      (status) => status.code?.toUpperCase() === 'CANDIDAT'
    )?.id || "";
  }, [referenceData]);

  const { control, register, handleSubmit, reset, formState: { errors } } = useForm<NewArtisanFormValues>({
    defaultValues: {
      ...buildDefaultFormValues(),
      statut_id: defaultCandidatStatusId,
    },
  })

  const createArtisan = useMutation({
    mutationFn: (payload: ReturnType<typeof buildCreatePayload>) => artisansApiV2.create(payload),
  })

  const metierOptions = useMemo(
    () => (referenceData?.metiers ?? []).map((metier) => ({
      id: metier.id,
      label: metier.label ?? metier.code ?? metier.id,
    })),
    [referenceData],
  )

  // Filtrer les statuts pour ne permettre que CANDIDAT et POTENTIEL à la création
  const statusOptions = useMemo(
    () => (referenceData?.artisanStatuses ?? [])
      .filter((status) => {
        const code = status.code?.toUpperCase();
        return code === 'CANDIDAT' || code === 'POTENTIEL';
      })
      .map((status) => ({
        id: status.id,
        label: status.label ?? status.code ?? status.id,
      })),
    [referenceData],
  )

  const gestionnaireOptions = useMemo(
    () => (referenceData?.users ?? []).map((user) => {
      const name = [user.firstname, user.lastname].filter(Boolean).join(" ").trim()
      return {
        id: user.id,
        label: name || user.username || user.id,
      }
    }),
    [referenceData],
  )

  const onSubmit = async (values: NewArtisanFormValues) => {
    try {
      const payload = buildCreatePayload(values)
      const created = await createArtisan.mutateAsync(payload)

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("artisan-updated", {
            detail: {
              id: created.id,
              data: created,
              optimistic: true,
              type: "create",
            },
          }),
        )
      }

      toast({
        title: "Artisan créé",
        description: "La fiche artisan a été enregistrée.",
      })
      reset(buildDefaultFormValues())
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de créer l'artisan."
      toast({
        title: "Échec de la création",
        description: message,
        variant: "destructive",
      })
    }
  }

  const handleSubmitClick = () => {
    if (formRef.current) {
      formRef.current.requestSubmit()
    }
  }

  const isSubmitting = createArtisan.isPending
  const isLoading = referenceLoading && !referenceData
  const bodyPadding = mode === "fullpage" ? "px-8 py-6 md:px-12" : "px-5 py-4 md:px-8"
  const surfaceVariantClass = mode === "fullpage" ? "modal-config-surface-full" : undefined
  const surfaceModeClass = `modal-config--${mode}`

  const renderMetiersControl = () => (
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
                  <Badge key={option.id} variant="secondary" className="flex items-center gap-1">
                    {option.label}
                    <button type="button" className="focus:outline-none" onClick={() => toggleMetier(option.id)}>
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
  )

  return (
    <TooltipProvider>
      <div className={cn("modal-config-surface", surfaceVariantClass, surfaceModeClass)}>
        <header className="modal-config-columns-header">
          <div className="flex items-center gap-3">
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
          <div className="modal-config-columns-title">Créer un artisan</div>
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
        </header>

        <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="flex flex-1 min-h-0 flex-col">
          <div className="modal-config-columns-body overflow-y-auto">
            <div className={cn(bodyPadding, "space-y-6")}>
              {isLoading ? (
                <div className="space-y-5">
                  <div className="h-7 w-60 rounded bg-muted animate-pulse" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="h-32 rounded-lg bg-muted animate-pulse" />
                    <div className="h-32 rounded-lg bg-muted animate-pulse" />
                  </div>
                  <div className="h-48 rounded-lg bg-muted animate-pulse" />
                </div>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Identité du contact</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="prenom">Prénom</Label>
                          <Input id="prenom" placeholder="Prénom" {...register("prenom")} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nom">Nom</Label>
                          <Input id="nom" placeholder="Nom" {...register("nom")} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="raison_sociale">Raison sociale</Label>
                        <Input id="raison_sociale" placeholder="Entreprise" {...register("raison_sociale")} />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="telephone">Téléphone</Label>
                          <Input id="telephone" placeholder="06 00 00 00 00" {...register("telephone")} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="telephone2">Téléphone secondaire</Label>
                          <Input id="telephone2" placeholder="Optionnel" {...register("telephone2")} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="contact@email.com" {...register("email")} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Informations administratives</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="statut_juridique">Statut juridique</Label>
                          <Input id="statut_juridique" placeholder="SARL, SAS..." {...register("statut_juridique")} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="numero_associe">Numéro associé</Label>
                          <Input id="numero_associe" placeholder="Code interne" {...register("numero_associe")} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="siret">Siret</Label>
                        <Controller
                          name="siret"
                          control={control}
                          rules={{
                            validate: (value) => {
                              const siret = value?.trim() || ""
                              if (siret.length === 0) return true // Vide est valide
                              if (siret.length === 14 && /^\d+$/.test(siret)) return true // 14 chiffres est valide
                              return "Le SIRET doit être soit vide, soit contenir exactement 14 chiffres"
                            },
                          }}
                          render={({ field, fieldState }) => (
                            <div className="space-y-1">
                              <InputOTP
                                maxLength={14}
                                pattern={REGEXP_ONLY_DIGITS}
                                value={field.value}
                                onChange={(value) => field.onChange(value)}
                              >
                                <InputOTPGroup>
                                  <InputOTPSlot index={0} />
                                  <InputOTPSlot index={1} />
                                  <InputOTPSlot index={2} />
                                </InputOTPGroup>
                                <InputOTPSeparator />
                                <InputOTPGroup>
                                  <InputOTPSlot index={3} />
                                  <InputOTPSlot index={4} />
                                  <InputOTPSlot index={5} />
                                </InputOTPGroup>
                                <InputOTPSeparator />
                                <InputOTPGroup>
                                  <InputOTPSlot index={6} />
                                  <InputOTPSlot index={7} />
                                  <InputOTPSlot index={8} />
                                </InputOTPGroup>
                                <InputOTPSeparator />
                                <InputOTPGroup>
                                  <InputOTPSlot index={9} />
                                  <InputOTPSlot index={10} />
                                  <InputOTPSlot index={11} />
                                  <InputOTPSlot index={12} />
                                  <InputOTPSlot index={13} />
                                </InputOTPGroup>
                              </InputOTP>
                              {fieldState.error && (
                                <p className="text-sm text-destructive">{fieldState.error.message}</p>
                              )}
                            </div>
                          )}
                        />
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
                        {renderMetiersControl()}
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
                      <CardTitle>Suivi & Statuts</CardTitle>
                    </CardHeader>
                    <CardContent className={cn("space-y-4", mode === "halfpage" ? "md:grid md:grid-cols-2 md:gap-6" : "")}>
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
                        <Label>Statut artisan</Label>
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
                </>
              )}
            </div>
          </div>

          <footer className="modal-config-columns-footer flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleSubmitClick}
              disabled={isSubmitting}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isSubmitting ? "Création..." : "Créer l'artisan"}
            </Button>
          </footer>
        </form>
      </div>
    </TooltipProvider>
  )
}

export default NewArtisanModalContent
