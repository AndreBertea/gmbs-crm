"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import InterventionEditor from "../../../app/interventions/[id]/InterventionEditor"
import type { InterventionWithDocuments } from "@/types/interventions"
import { queryKeys } from "@/lib/query-keys"

const fetchInterventionDetail = async (id: string): Promise<InterventionWithDocuments> => {
  const response = await fetch(`/api/interventions/${id}`)
  if (!response.ok) {
    const message = response.status === 404 ? "Intervention introuvable" : "Une erreur est survenue"
    throw new Error(message)
  }
  return (await response.json()) as InterventionWithDocuments
}

type Props = {
  interventionId: string
  mode?: "page" | "modal"
}

export function InterventionDetailContent({ interventionId, mode = "page" }: Props) {
  const {
    data: intervention,
    error,
    isLoading,
  } = useQuery({
    queryKey: queryKeys.intervention(interventionId),
    queryFn: () => fetchInterventionDetail(interventionId),
    enabled: Boolean(interventionId),
  })

  const headerClassName = useMemo(() => {
    if (mode === "modal") {
      return "flex flex-col gap-2 border-b pb-4"
    }
    return "flex items-center justify-between"
  }, [mode])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 rounded bg-muted animate-pulse" />
        <div className="h-4 w-72 rounded bg-muted animate-pulse" />
        <div className="space-y-3">
          <div className="h-10 rounded bg-muted animate-pulse" />
          <div className="h-10 rounded bg-muted animate-pulse" />
          <div className="h-10 rounded bg-muted animate-pulse" />
        </div>
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

  if (!intervention) {
    return (
      <div className="rounded border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Intervention introuvable
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className={headerClassName}>
        <div>
          <h1 className="text-2xl font-semibold">{intervention.name}</h1>
          <p className="text-sm text-muted-foreground">
            ID intervention / Invoice2go : {intervention.invoice2goId ?? "À compléter"}
          </p>
        </div>
        <Badge>{intervention.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Détails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-muted-foreground">Contexte</p>
            <p className="font-medium leading-snug">{intervention.context}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Adresse</p>
            <p className="font-medium leading-snug">{intervention.address}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Agence</p>
              <p className="font-medium leading-snug">{intervention.agency ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Échéance</p>
              <p className="font-medium leading-snug">
                {intervention.dueAt ? new Date(intervention.dueAt).toLocaleDateString() : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modifier l&apos;intervention</CardTitle>
        </CardHeader>
        <CardContent>
          <InterventionEditor intervention={intervention} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents liés</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            action={`/api/interventions/${intervention.id}/documents`}
            method="post"
            encType="multipart/form-data"
            className="flex flex-col gap-2"
          >
            <label className="text-sm font-medium" htmlFor="document">
              Ajouter un document
            </label>
            <input id="document" name="file" type="file" className="text-sm" />
            <textarea name="metadata" placeholder='{"type":"devis"}' className="rounded border p-2 text-xs" />
            <Button type="submit" variant="secondary">
              Téléverser
            </Button>
            <p className="text-xs text-muted-foreground">
              TODO: brancher le téléversement Supabase Storage depuis le client (Dropzone, preview files, etc.).
            </p>
          </form>

          {intervention.documents.length ? (
            <>
              <ul className="space-y-2 text-sm">
                {intervention.documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between rounded border p-2">
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.mimeType}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <a href={doc.publicUrl ?? "#"} target="_blank" rel="noreferrer">
                          Télécharger
                        </a>
                      </Button>
                      <Button variant="destructive" size="sm" type="button" disabled>
                        Supprimer
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-muted-foreground">
                TODO: permettre la suppression côté client avec confirmation & rafraîchissement automatique.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun document pour cette intervention.</p>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        TODO: afficher la prévisualisation du devis Invoice2go et connecter la timeline des statuts.
      </p>
    </div>
  )
}

export default InterventionDetailContent
