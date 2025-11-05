import { addDays } from "date-fns"
import { createServerSupabase } from "@/lib/supabase/server"
import { INTERVENTION_STATUS_ORDER } from "@/config/interventions"
import {
  CreateInterventionSchema,
  DuplicateCheckSchema,
  type CreateInterventionInput,
  type DuplicateCheckInput,
  type InterventionStatusValue,
  type InterventionWithDocuments,
  type UpdateInterventionInput,
  UpdateInterventionSchema,
} from "@/types/interventions"
import {
  buildDuplicateSummary,
  buildInsertPayload,
  buildStatusUpdatePayload,
  buildUpdatePayload,
  mapRowToIntervention,
  mapRowToInterventionWithDocuments,
  mapStatusToDb,
} from "@/lib/interventions/mappers"
import { listInterventionDocuments } from "@/lib/api/documents"
import { interventionsApi } from "@/lib/api/v2"
import type { InterventionStatus } from "@/types/intervention"

const DEFAULT_LIMIT = 50

export type ListParams = {
  status?: InterventionStatusValue
  search?: string
  take?: number
  skip?: number
  withDocuments?: boolean
}

export type ListResult = {
  data: InterventionWithDocuments[]
  total: number
}

const computeDueDate = (payload: { status?: InterventionStatusValue; dueAt?: Date | string | null }) => {
  if (payload.status === "EN_COURS") {
    if (!payload.dueAt) {
      return addDays(new Date(), 7)
    }
  }
  if (!payload.dueAt) return null
  if (payload.dueAt instanceof Date) return payload.dueAt
  return new Date(payload.dueAt)
}

const assertBusinessRules = (payload: { status?: InterventionStatusValue | null; artisanId?: string | null }) => {
  if (payload.status && ["VISITE_TECHNIQUE", "EN_COURS", "TERMINE"].includes(payload.status) && !payload.artisanId) {
    throw new Error("Un artisan assigné est requis pour ce statut")
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const isUUID = (value: string) => UUID_REGEX.test(value)

const escapeIlike = (value: string) => value.replace(/[%_]/g, (match) => `\\${match}`)

export async function listInterventions(params: ListParams = {}): Promise<ListResult> {
  const supabase = createServerSupabase()
  const take = params.take ?? DEFAULT_LIMIT
  const skip = params.skip ?? 0

  let query = supabase
    .from("interventions")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(skip, skip + take - 1)

  if (params.status) {
    query = query.eq("statut", mapStatusToDb(params.status))
  }

  if (params.search) {
    const search = escapeIlike(params.search.trim())
    const pattern = `%${search}%`
    query = query.or(
      `contexte_intervention.ilike.${pattern},commentaire_agent.ilike.${pattern},adresse.ilike.${pattern}`,
    )
  }

  const { data, error, count } = await query
  if (error) {
    throw new Error(`Impossible de récupérer les interventions: ${error.message}`)
  }

  const rows = data ?? []
  const mapped = rows.map((row) => mapRowToInterventionWithDocuments(row))

  return {
    data: mapped,
    total: count ?? mapped.length,
  }
}

type GetParams = {
  id: string
  includeDocuments?: boolean
}

export async function getIntervention({ id, includeDocuments = true }: GetParams) {
  const supabase = createServerSupabase()
  const { data, error } = await supabase.from("interventions").select("*").eq("id", id).maybeSingle()

  if (error) {
    throw new Error(`Erreur lors de la récupération de l'intervention: ${error.message}`)
  }
  if (!data) return null

  const intervention = mapRowToIntervention(data)
  if (!includeDocuments) {
    return intervention
  }

  const documents = await listInterventionDocuments(id)
  return { ...intervention, documents }
}

export async function findDuplicates(input: DuplicateCheckInput) {
  const supabase = createServerSupabase()
  const { name, address, agency } = DuplicateCheckSchema.parse(input)
  const results = new Map<string, ReturnType<typeof buildDuplicateSummary>[number]>()

  const normalizedAddress = address.trim()
  const normalizedContext = name.trim()

  if (normalizedContext && normalizedAddress) {
    const { data, error } = await supabase
      .from("interventions")
      .select("id, contexte_intervention, adresse, agence_id, commentaire_agent")
      .eq("adresse", normalizedAddress)
      .eq("contexte_intervention", normalizedContext)
      .limit(5)

    if (!error && data) {
      for (const item of buildDuplicateSummary(data)) {
        results.set(item.id, item)
      }
    }
  }

  if (agency) {
    const { data, error } = await supabase
      .from("interventions")
      .select("id, contexte_intervention, adresse, agence_id, commentaire_agent")
      .eq("adresse", normalizedAddress)
      .eq("agence_id", agency.trim())
      .limit(5)

    if (!error && data) {
      for (const item of buildDuplicateSummary(data)) {
        results.set(item.id, item)
      }
    }
  }

  return Array.from(results.values())
}

export async function createIntervention(payload: CreateInterventionInput) {
  const parsed = CreateInterventionSchema.parse(payload)
  assertBusinessRules(parsed)

  const duplicates = await findDuplicates(parsed)
  if (duplicates.length > 0) {
    return { duplicates }
  }

  const dueAt = computeDueDate(parsed)
  const supabase = createServerSupabase()

  const insertPayload = buildInsertPayload({ ...parsed, dueAt: dueAt ?? undefined })

  const { data, error } = await supabase
    .from("interventions")
    .insert(insertPayload)
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(`Échec de la création de l'intervention: ${error?.message ?? "unknown"}`)
  }

  const intervention = mapRowToInterventionWithDocuments(data)
  return { intervention }
}

export async function updateIntervention(id: string, payload: UpdateInterventionInput) {
  const parsed = UpdateInterventionSchema.parse(payload)
  assertBusinessRules(parsed)

  const dueAt = computeDueDate(parsed)
  const supabase = createServerSupabase()

  const updatePayload = buildUpdatePayload({ ...parsed, dueAt: dueAt ?? undefined })

  const { data, error } = await supabase
    .from("interventions")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(`Échec de la mise à jour de l'intervention: ${error?.message ?? "unknown"}`)
  }

  return mapRowToInterventionWithDocuments(data)
}

export async function deleteIntervention(id: string) {
  const supabase = createServerSupabase()
  const { error } = await supabase.from("interventions").delete().eq("id", id)
  if (error) {
    throw new Error(`Impossible de supprimer l'intervention: ${error.message}`)
  }
}

export type StatusPayload = {
  status: InterventionStatusValue
  dueAt?: Date | string | null
  artisanId?: string | null
}

export async function transitionStatus(id: string, payload: StatusPayload) {
  assertBusinessRules(payload)
  const dueAt = computeDueDate(payload)
  const statusInput = payload.status

  let resolvedStatus: InterventionStatus | null = null
  let statusId: string | null = null

  if (isUUID(statusInput)) {
    statusId = statusInput
  } else {
    resolvedStatus =
      (await interventionsApi.getStatusByCode(statusInput)) ??
      (await interventionsApi.getStatusByLabel(statusInput))

    if (!resolvedStatus) {
      throw new Error(`Statut "${statusInput}" introuvable`)
    }

    statusId = resolvedStatus.id
  }

  if (!statusId) {
    throw new Error("Statut cible non défini")
  }

  const legacyPayload = buildStatusUpdatePayload(payload.status, dueAt, payload.artisanId ?? null)
  const datePrevueUpdate =
    legacyPayload.date_prevue === undefined ? undefined : legacyPayload.date_prevue ?? null
  const artisanIdUpdate =
    payload.artisanId === undefined ? undefined : payload.artisanId ?? null

  const updated = await interventionsApi.update(id, {
    statut_id: statusId,
    artisan_id: artisanIdUpdate,
    date_prevue: datePrevueUpdate,
  })

  const mapped = mapRowToInterventionWithDocuments({
    ...updated,
    statut: updated.status?.code ?? updated.statut ?? payload.status,
    statut_id: updated.status?.id ?? statusId ?? updated.statut_id ?? null,
  })

  return {
    ...mapped,
    status: updated.status ?? resolvedStatus,
    statusColor: updated.status?.color ?? mapped.statusColor ?? null,
  }
}

export function getStatusSortIndex(status: InterventionStatusValue) {
  return INTERVENTION_STATUS_ORDER.indexOf(status) ?? 0
}
