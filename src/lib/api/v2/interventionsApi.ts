// ===== API INTERVENTIONS V2 =====
// Gestion complète des interventions

import { referenceApi } from "@/lib/reference-api";
import { supabase } from "@/lib/supabase-client";
import type {
  BulkOperationResult,
  CreateInterventionData,
  GestionnaireMarginRanking,
  Intervention,
  InterventionCost,
  InterventionPayment,
  InterventionQueryParams,
  InterventionStatsByStatus,
  MarginCalculation,
  MarginRankingResult,
  MarginStats,
  MonthlyStats,
  PaginatedResponse,
  StatsPeriod,
  UpdateInterventionData,
  WeeklyStats,
  WeekDayStats,
  MonthWeekStats,
  YearMonthStats,
  YearlyStats,
} from "./common/types";
import {
  SUPABASE_FUNCTIONS_URL,
  getHeaders,
  handleResponse,
  mapInterventionRecord,
} from "./common/utils";
import type { InterventionWithStatus, InterventionStatus } from "@/types/intervention";

// Cache pour les données de référence
type ReferenceCache = {
  data: any;
  fetchedAt: number;
  usersById: Map<string, any>;
  agenciesById: Map<string, any>;
  interventionStatusesById: Map<string, any>;
  artisanStatusesById: Map<string, any>;
  metiersById: Map<string, any>;
};

const REFERENCE_CACHE_DURATION = 5 * 60 * 1000;
let referenceCache: ReferenceCache | null = null;
let referenceCachePromise: Promise<ReferenceCache> | null = null;

export const invalidateReferenceCache = () => {
  referenceCache = null;
  referenceCachePromise = null;
};

async function getReferenceCache(): Promise<ReferenceCache> {
  const now = Date.now();
  if (referenceCache && now - referenceCache.fetchedAt < REFERENCE_CACHE_DURATION) {
    return referenceCache;
  }

  if (referenceCachePromise) {
    return referenceCachePromise;
  }

  referenceCachePromise = (async () => {
    const data = await referenceApi.getAll();
    const cache: ReferenceCache = {
      data,
      fetchedAt: Date.now(),
      usersById: new Map(data.users.map((user: any) => [user.id, user])),
      agenciesById: new Map(data.agencies.map((agency: any) => [agency.id, agency])),
      interventionStatusesById: new Map(data.interventionStatuses.map((status: any) => [status.id, status])),
      artisanStatusesById: new Map(data.artisanStatuses.map((status: any) => [status.id, status])),
      metiersById: new Map(data.metiers.map((metier: any) => [metier.id, metier])),
    };
    referenceCache = cache;
    referenceCachePromise = null;
    return cache;
  })();

  try {
    return await referenceCachePromise;
  } catch (error) {
    referenceCachePromise = null;
    throw error;
  }
}

export const interventionsApi = {
  // Récupérer toutes les interventions (ULTRA-OPTIMISÉ)
  async getAll(params?: InterventionQueryParams): Promise<PaginatedResponse<InterventionWithStatus>> {
    // Version ultra-rapide : requête simple sans joins complexes
    let query = supabase
      .from("interventions")
      .select(
        `
          *,
          status:intervention_statuses(id,code,label,color,sort_order)
        `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    // Appliquer les filtres si nécessaire
    if (params?.statut) {
      query = query.eq("statut_id", params.statut);
    }
    if (params?.agence) {
      query = query.eq("agence_id", params.agence);
    }
    if (params?.user) {
      query = query.eq("assigned_user_id", params.user);
    }
    if (params?.artisan) {
      query = query.eq("artisan_id", params.artisan);
    }
    if (params?.startDate) {
      query = query.gte("date", params.startDate);
    }
    if (params?.endDate) {
      query = query.lte("date", params.endDate);
    }

    // Pagination
    const limit = params?.limit || 500;
    const offset = params?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const refs = await getReferenceCache();

    const transformedData = (data || []).map((item) =>
      mapInterventionRecord(item, refs) as InterventionWithStatus
    );

    return {
      data: transformedData,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + limit < (count || 0),
      },
    };
  },

  /**
   * Obtient le nombre total d'interventions (sans les charger)
   */
  async getTotalCount(): Promise<number> {
    const { count, error } = await supabase
      .from("interventions")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Erreur lors du comptage des interventions:", error);
      return 0;
    }

    return count || 0;
  },

  // Récupérer une intervention par ID
  async getById(id: string, include?: string[]): Promise<InterventionWithStatus> {
    const { data, error } = await supabase
      .from("interventions")
      .select(`
        *,
        status:intervention_statuses(id,code,label,color,sort_order),
        tenants (
          id,
          firstname,
          lastname,
          email,
          telephone,
          telephone2,
          adresse,
          ville,
          code_postal
        ),
        owner (
          id,
          owner_firstname,
          owner_lastname,
          telephone,
          telephone2,
          email,
          adresse,
          ville,
          code_postal
        ),
        intervention_artisans (
          artisan_id,
          role,
          is_primary,
          artisans (
            id,
            prenom,
            nom,
            plain_nom,
            telephone,
            email
          )
        ),
        intervention_costs (
          id,
          cost_type,
          label,
          amount,
          currency,
          metadata
        ),
        intervention_payments (
          id,
          payment_type,
          amount,
          currency,
          is_received,
          payment_date,
          reference
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) throw new Error("Intervention introuvable");

    const refs = await getReferenceCache();
    return mapInterventionRecord(data, refs) as InterventionWithStatus;
  },

  // Créer une intervention
  async create(data: CreateInterventionData): Promise<Intervention> {
    const headers = await getHeaders();
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/interventions-v2/interventions`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      }
    );
    return await handleResponse(response);
  },

  // Modifier une intervention
  async update(id: string, data: UpdateInterventionData): Promise<InterventionWithStatus> {
    let payload: UpdateInterventionData = { ...data }

    if (Object.prototype.hasOwnProperty.call(payload, "contexte_intervention")) {
      try {
        const { data: session } = await supabase.auth.getSession()
        const token = session?.session?.access_token
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })

        let isAdmin = false
        if (response.ok) {
          const current = await response.json()
          const roles: string[] = Array.isArray(current?.user?.roles) ? current.user.roles : []
          isAdmin = roles.some(
            (role) => typeof role === "string" && role.toLowerCase().includes("admin"),
          )
        }

        if (!isAdmin) {
          const { contexte_intervention: _ignored, ...rest } = payload
          payload = rest as UpdateInterventionData
        }
      } catch (error) {
        console.warn("[interventionsApi.update] Unable to verify user role, dropping context update", error)
        const { contexte_intervention: _ignored, ...rest } = payload
        payload = rest as UpdateInterventionData
      }
    }

    // Récupérer le statut actuel avant la mise à jour pour détecter si on passe à "terminé"
    let wasTerminatedBefore = false;
    if (payload.statut_id && typeof window !== "undefined") {
      const { data: currentIntervention } = await supabase
        .from("interventions")
        .select(`
          statut_id,
          status:intervention_statuses(code)
        `)
        .eq("id", id)
        .single();

      if (currentIntervention && (currentIntervention as any).status) {
        const terminatedStatusCodes = ['TERMINE', 'INTER_TERMINEE'];
        const currentStatusCode = (currentIntervention as any).status?.code;
        wasTerminatedBefore = currentStatusCode && terminatedStatusCodes.includes(currentStatusCode);
      }
    }

    const { data: updated, error } = await supabase
      .from("interventions")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(`
        *,
        status:intervention_statuses(id,code,label,color,sort_order)
      `)
      .single();

    if (error) throw error;
    if (!updated) throw new Error("Impossible de mettre à jour l'intervention");

    const refs = await getReferenceCache();
    const mapped = mapInterventionRecord(updated, refs) as InterventionWithStatus;

    // Si l'intervention vient de passer à un statut terminé, recalculer les statuts des artisans associés
    const terminatedStatusCodes = ['TERMINE', 'INTER_TERMINEE'];
    const isTerminated = mapped.status?.code && terminatedStatusCodes.includes(mapped.status.code);

    // Si le statut vient de passer à "terminé", recalculer les statuts des artisans
    if (isTerminated && !wasTerminatedBefore && typeof window !== "undefined") {
      // Récupérer les artisans associés à cette intervention
      const { data: interventionArtisans } = await supabase
        .from('intervention_artisans')
        .select('artisan_id, is_primary')
        .eq('intervention_id', id);

      if (interventionArtisans && interventionArtisans.length > 0) {
        // Prioriser les artisans primaires, sinon prendre tous
        const artisanIds = interventionArtisans
          .filter(ia => ia.is_primary === true)
          .map(ia => ia.artisan_id)
          .filter(Boolean) as string[];

        const finalArtisanIds = artisanIds.length > 0 
          ? artisanIds 
          : interventionArtisans.map(ia => ia.artisan_id).filter(Boolean) as string[];

        // Appeler l'API route pour recalculer chaque artisan en arrière-plan
        finalArtisanIds.forEach(artisanId => {
          fetch(`/api/artisans/${artisanId}/recalculate-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }).catch(error => {
            console.warn(`[interventionsApi] Erreur lors du recalcul pour artisan ${artisanId}:`, error);
          });
        });
      }
    }

    // Émettre un événement pour notifier que l'intervention a été mise à jour
    // Cela permet aux autres composants (comme la page artisans) de rafraîchir leurs données
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("intervention-updated", {
          detail: {
            id: mapped.id,
            data: mapped,
            optimistic: false,
            type: "update",
          },
        }),
      );
    }

    return mapped;
  },

  // Mettre à jour uniquement le statut d'une intervention
  async updateStatus(id: string, statusId: string): Promise<InterventionWithStatus> {
    if (!statusId) {
      throw new Error("Status ID is required");
    }
    return this.update(id, { statut_id: statusId });
  },

  async setPrimaryArtisan(interventionId: string, artisanId: string | null): Promise<void> {
    if (!interventionId) {
      throw new Error("interventionId is required");
    }

    const { data: existingPrimary, error: primaryError } = await supabase
      .from('intervention_artisans')
      .select('id, artisan_id, role')
      .eq('intervention_id', interventionId)
      .eq('is_primary', true)
      .maybeSingle();

    if (primaryError) {
      throw new Error(`Erreur lors de la récupération de l'artisan primaire: ${primaryError.message}`);
    }

    // Aucun artisan sélectionné => supprimer le primaire courant
    if (!artisanId) {
      if (existingPrimary?.id) {
        const { error: deleteError } = await supabase
          .from('intervention_artisans')
          .delete()
          .eq('id', existingPrimary.id);

        if (deleteError) {
          throw new Error(`Erreur lors de la suppression de l'artisan primaire: ${deleteError.message}`);
        }
      }
      return;
    }

    // Rien à faire, c'est déjà le bon artisan
    if (existingPrimary?.artisan_id === artisanId) {
      const { error: ensurePrimaryError } = await supabase
        .from('intervention_artisans')
        .update({
          role: 'primary',
          is_primary: true,
        })
        .eq('id', existingPrimary.id);

      if (ensurePrimaryError) {
        throw new Error(`Erreur lors de la mise à jour de l'artisan primaire: ${ensurePrimaryError.message}`);
      }
      return;
    }

    // Récupérer un éventuel lien existant avec cet artisan
    const { data: existingLink, error: linkError } = await supabase
      .from('intervention_artisans')
      .select('id')
      .eq('intervention_id', interventionId)
      .eq('artisan_id', artisanId)
      .maybeSingle();

    if (linkError) {
      throw new Error(`Erreur lors de la récupération de l'artisan: ${linkError.message}`);
    }

    // Rétrograder l'artisan primaire actuel (le garder comme secondaire)
    if (existingPrimary?.id) {
      const { error: demoteError } = await supabase
        .from('intervention_artisans')
        .update({
          is_primary: false,
          role: existingPrimary.role === 'primary' ? 'secondary' : existingPrimary.role,
        })
        .eq('id', existingPrimary.id);

      if (demoteError) {
        throw new Error(`Erreur lors de la mise à jour de l'ancien artisan primaire: ${demoteError.message}`);
      }
    }

    if (existingLink?.id) {
      const { error: promoteError } = await supabase
        .from('intervention_artisans')
        .update({
          role: 'primary',
          is_primary: true,
        })
        .eq('id', existingLink.id);

      if (promoteError) {
        throw new Error(`Erreur lors de la mise à jour de l'artisan primaire: ${promoteError.message}`);
      }
      return;
    }

    const { error: insertError } = await supabase
      .from('intervention_artisans')
      .insert({
        intervention_id: interventionId,
        artisan_id: artisanId,
        role: 'primary',
        is_primary: true,
      });

    if (insertError) {
      throw new Error(`Erreur lors de l'assignation de l'artisan primaire: ${insertError.message}`);
    }
  },

  // Supprimer une intervention (soft delete)
  async delete(id: string): Promise<{ message: string; data: Intervention }> {
    const headers = await getHeaders();
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/interventions-v2/interventions/${id}`,
      {
        method: "DELETE",
        headers,
      }
    );
    return handleResponse(response);
  },

  // Assigner un artisan à une intervention
  async assignArtisan(
    interventionId: string,
    artisanId: string,
    role: "primary" | "secondary" = "primary"
  ): Promise<any> {
    const { data: result, error } = await supabase
      .from('intervention_artisans')
      .insert({
        intervention_id: interventionId,
        artisan_id: artisanId,
        role: role,
        is_primary: role === "primary"
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur lors de l'assignation de l'artisan: ${error.message}`);
    }

    return result;
  },

  // Ajouter un coût à une intervention
  async addCost(
    interventionId: string,
    data: {
      cost_type: "sst" | "materiel" | "intervention" | "marge";
      label?: string;
      amount: number;
      currency?: string;
      metadata?: any;
    }
  ): Promise<InterventionCost> {
    const { data: result, error } = await supabase
      .from('intervention_costs')
      .insert({
        intervention_id: interventionId,
        cost_type: data.cost_type,
        label: data.label || null,
        amount: data.amount,
        currency: data.currency || 'EUR',
        metadata: data.metadata ? JSON.stringify(data.metadata) : null
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur lors de l'ajout du coût: ${error.message}`);
    }

    return result;
  },

  // Mettre à jour ou créer un coût pour une intervention (upsert)
  async upsertCost(
    interventionId: string,
    data: {
      cost_type: "sst" | "materiel" | "intervention" | "total";
      label?: string;
      amount: number;
      currency?: string;
      metadata?: any;
    }
  ): Promise<InterventionCost> {
    // Vérifier si le coût existe déjà
    const { data: existingCost, error: findError } = await supabase
      .from('intervention_costs')
      .select('id')
      .eq('intervention_id', interventionId)
      .eq('cost_type', data.cost_type)
      .maybeSingle();

    if (findError && findError.code !== 'PGRST116') {
      throw new Error(`Erreur lors de la recherche du coût: ${findError.message}`);
    }

    if (existingCost) {
      // Mettre à jour le coût existant
      const { data: result, error: updateError } = await supabase
        .from('intervention_costs')
        .update({
          amount: data.amount,
          label: data.label || null,
          currency: data.currency || 'EUR',
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCost.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Erreur lors de la mise à jour du coût: ${updateError.message}`);
      }

      return result;
    } else {
      // Créer un nouveau coût
      return this.addCost(interventionId, data);
    }
  },

  // Ajouter un paiement à une intervention
  async addPayment(
    interventionId: string,
    data: {
      payment_type: string;
      amount: number;
      currency?: string;
      is_received?: boolean;
      payment_date?: string;
      reference?: string;
    }
  ): Promise<InterventionPayment> {
    const { data: result, error } = await supabase
      .from('intervention_payments')
      .insert({
        intervention_id: interventionId,
        payment_type: data.payment_type,
        amount: data.amount,
        currency: data.currency || 'EUR',
        is_received: data.is_received || false,
        payment_date: data.payment_date || null,
        reference: data.reference || null
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur lors de l'ajout du paiement: ${error.message}`);
    }

    return result;
  },

  // Upsert une intervention (créer ou mettre à jour)
  async upsert(data: CreateInterventionData & { id_inter?: string }): Promise<Intervention> {
    const headers = await getHeaders();
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/interventions-v2/interventions/upsert`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  // Upsert direct via Supabase (pour import en masse)
  async upsertDirect(data: CreateInterventionData & { id_inter?: string }): Promise<Intervention> {
    const { data: result, error } = await supabase
      .from('interventions')
      .upsert(data, {
        onConflict: 'id_inter',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) throw new Error(`Erreur lors de l'upsert de l'intervention: ${error.message}`);

    const refs = await getReferenceCache();
    return mapInterventionRecord(result, refs);
  },

  // Insérer plusieurs coûts pour des interventions
  async insertInterventionCosts(
    costs: Array<{
      intervention_id: string;
      cost_type: "sst" | "materiel" | "intervention" | "marge";
      label?: string;
      amount: number;
      currency?: string;
      metadata?: any;
    }>
  ): Promise<BulkOperationResult> {
    const results = { success: 0, errors: 0, details: [] as any[] };

    for (const cost of costs) {
      try {
        const result = await this.addCost(cost.intervention_id, cost);
        results.success++;
        results.details.push({ item: cost, success: true, data: result });
      } catch (error: any) {
        results.errors++;
        results.details.push({ item: cost, success: false, error: error.message });
      }
    }

    return results;
  },

  // Créer plusieurs interventions en lot
  async createBulk(interventions: CreateInterventionData[]): Promise<BulkOperationResult> {
    const results = { success: 0, errors: 0, details: [] as any[] };

    for (const intervention of interventions) {
      try {
        const result = await this.create(intervention);
        results.success++;
        results.details.push({ item: intervention, success: true, data: result });
      } catch (error: any) {
        results.errors++;
        results.details.push({ item: intervention, success: false, error: error.message });
      }
    }

    return results;
  },

  // Récupérer les interventions par utilisateur
  async getByUser(userId: string, params?: InterventionQueryParams): Promise<PaginatedResponse<Intervention>> {
    return this.getAll({ ...params, user: userId });
  },

  // Récupérer les interventions par statut
  async getByStatus(statusId: string, params?: InterventionQueryParams): Promise<PaginatedResponse<Intervention>> {
    return this.getAll({ ...params, statut: statusId });
  },

  // Récupérer les interventions par agence
  async getByAgency(agencyId: string, params?: InterventionQueryParams): Promise<PaginatedResponse<Intervention>> {
    return this.getAll({ ...params, agence: agencyId });
  },

  // Récupérer les interventions par artisan via interventions_artisans
  async getByArtisan(artisanId: string, params?: Omit<InterventionQueryParams, "artisan">): Promise<PaginatedResponse<InterventionWithStatus>> {
    // Requête avec join sur interventions_artisans
    // On utilise une sous-requête pour obtenir les IDs d'interventions liées à l'artisan
    const { data: interventionArtisans, error: joinError } = await supabase
      .from("intervention_artisans")
      .select("intervention_id")
      .eq("artisan_id", artisanId);

    if (joinError) throw joinError;

    const interventionIds = (interventionArtisans || []).map((ia) => ia.intervention_id).filter(Boolean);

    if (interventionIds.length === 0) {
      return {
        data: [],
        pagination: {
          total: 0,
          limit: params?.limit || 5000,
          offset: params?.offset || 0,
          hasMore: false,
        },
      };
    }

    let query = supabase
      .from("interventions")
      .select(
        `
          *,
          status:intervention_statuses(id,code,label,color,sort_order),
          intervention_artisans (
            artisan_id,
            is_primary,
            role
          ),
          intervention_costs (
            id,
            cost_type,
            label,
            amount,
            currency,
            metadata
          )
        `,
        { count: "exact" }
      )
      .in("id", interventionIds)
      .order("created_at", { ascending: false });

    // Appliquer les autres filtres si nécessaire
    if (params?.statut) {
      query = query.eq("statut_id", params.statut);
    }
    if (params?.agence) {
      query = query.eq("agence_id", params.agence);
    }
    if (params?.user) {
      query = query.eq("assigned_user_id", params.user);
    }
    if (params?.startDate) {
      query = query.gte("date", params.startDate);
    }
    if (params?.endDate) {
      query = query.lte("date", params.endDate);
    }

    // Pagination
    const limit = params?.limit || 5000;
    const offset = params?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const refs = await getReferenceCache();

    const transformedData = (data || []).map((item) =>
      mapInterventionRecord(item, refs) as InterventionWithStatus
    );

    return {
      data: transformedData,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + limit < (count || 0),
      },
    };
  },

  // Récupérer les interventions par période
  async getByDateRange(
    startDate: string,
    endDate: string,
    params?: InterventionQueryParams
  ): Promise<PaginatedResponse<Intervention>> {
    return this.getAll({ ...params, startDate, endDate });
  },

  /**
   * Récupère tous les statuts d'intervention disponibles
   */
  async getAllStatuses(): Promise<InterventionStatus[]> {
    const { data, error } = await supabase
      .from('intervention_statuses')
      .select('id, code, label, color, sort_order')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data as InterventionStatus[] | null) ?? [];
  },

  /**
   * Récupère un statut par son code (ou null si introuvable)
   */
  async getStatusByCode(code: string): Promise<InterventionStatus | null> {
    if (!code) return null;
    const { data, error } = await supabase
      .from('intervention_statuses')
      .select('id, code, label, color, sort_order')
      .eq('code', code)
      .single();

    if (error) {
      if ((error as any).code === 'PGRST116') return null;
      if (error.message?.includes('Results contain 0 rows')) return null;
      throw error;
    }
    return (data as InterventionStatus | null) ?? null;
  },

  /**
   * Récupère un statut par son label (ou null si introuvable)
   */
  async getStatusByLabel(label: string): Promise<InterventionStatus | null> {
    if (!label) return null;
    const { data, error } = await supabase
      .from('intervention_statuses')
      .select('id, code, label, color, sort_order')
      .ilike('label', label)
      .single();

    if (error) {
      if ((error as any).code === 'PGRST116') return null;
      if (error.message?.includes('Results contain 0 rows')) return null;
      throw error;
    }
    return (data as InterventionStatus | null) ?? null;
  },

  /**
   * Récupère les statistiques d'interventions par statut pour un utilisateur
   * @param userId - ID de l'utilisateur
   * @param startDate - Date de début (optionnelle, format ISO string)
   * @param endDate - Date de fin (optionnelle, format ISO string)
   * @returns Statistiques avec le nombre d'interventions par statut
   */
  async getStatsByUser(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<InterventionStatsByStatus> {
    if (!userId) {
      throw new Error("userId is required");
    }

    // Construire la requête de base
    let query = supabase
      .from("interventions")
      .select(
        `
        statut_id,
        status:intervention_statuses(id, code, label)
        `,
        { count: "exact" }
      )
      .eq("assigned_user_id", userId)
      .eq("is_active", true); // Seulement les interventions actives

    // Appliquer les filtres de date si fournis
    if (startDate) {
      query = query.gte("date", startDate);
    }
    if (endDate) {
      query = query.lte("date", endDate);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Erreur lors de la récupération des statistiques: ${error.message}`);
    }

    // Initialiser les compteurs
    const byStatus: Record<string, number> = {};
    const byStatusLabel: Record<string, number> = {};

    // Compter les interventions par statut
    (data || []).forEach((item: any) => {
      const status = item.status;
      if (status) {
        const code = status.code || "SANS_STATUT";
        const label = status.label || "Sans statut";

        byStatus[code] = (byStatus[code] || 0) + 1;
        byStatusLabel[label] = (byStatusLabel[label] || 0) + 1;
      } else {
        // Intervention sans statut
        byStatus["SANS_STATUT"] = (byStatus["SANS_STATUT"] || 0) + 1;
        byStatusLabel["Sans statut"] = (byStatusLabel["Sans statut"] || 0) + 1;
      }
    });

    return {
      total: count || 0,
      by_status: byStatus,
      by_status_label: byStatusLabel,
      period: {
        start_date: startDate || null,
        end_date: endDate || null,
      },
    };
  },

  // ========================================
  // FONCTION COMMUNALISÉE DE CALCUL DE MARGE
  // ========================================
  /**
   * Calcule la marge pour une intervention à partir de ses coûts
   * Formule utilisée : Taux de marque = (marge / prix de vente) * 100
   * 
   * @param costs - Liste des coûts de l'intervention
   * @param interventionId - ID de l'intervention (optionnel, pour les logs)
   * @returns Objet avec revenue, costs, margin, marginPercentage ou null si pas de revenu
   */
  calculateMarginForIntervention(
    costs: InterventionCost[],
    interventionId?: string | number
  ): MarginCalculation | null {
    if (!costs || costs.length === 0) {
      return null;
    }

    // Extraire les coûts par type
    let coutIntervention = 0; // Prix de vente
    let coutSST = 0;
    let coutMateriel = 0;

    costs.forEach((cost) => {
      switch (cost.cost_type) {
        case "intervention":
          coutIntervention = cost.amount || 0;
          break;
        case "sst":
          coutSST = cost.amount || 0;
          break;
        case "materiel":
          coutMateriel = cost.amount || 0;
          break;
      }
    });

    // Pas de calcul si pas de revenu (prix de vente)
    if (coutIntervention <= 0) {
      return null;
    }

    const totalCostForIntervention = coutSST + coutMateriel;
    const marge = coutIntervention - totalCostForIntervention;

    // Calcul du pourcentage : Taux de marque = marge / prix de vente
    // Exemple : vente 100€, coûts 80€ → marge 20€ → 20/100 = 20%
    const marginPercentage = (marge / coutIntervention) * 100;

    // Debug pour interventions avec marge négative
    if (marge < 0) {
      const idStr = interventionId ? ` (ID: ${interventionId})` : '';
      console.log(
        `[MarginStats] Intervention avec perte${idStr} : ` +
        `vente ${coutIntervention.toFixed(2)}€, ` +
        `coûts ${totalCostForIntervention.toFixed(2)}€, ` +
        `marge ${marge.toFixed(2)}€ (${marginPercentage.toFixed(2)}%)`
      );
    }

    return {
      revenue: coutIntervention,
      costs: totalCostForIntervention,
      margin: marge,
      marginPercentage: marginPercentage,
    };
  },

  /**
   * Récupère les statistiques de marge pour un utilisateur
   * @param userId - ID de l'utilisateur
   * @param startDate - Date de début (optionnelle, format ISO string)
   * @param endDate - Date de fin (optionnelle, format ISO string)
   * @returns Statistiques de marge avec le pourcentage moyen
   */
  async getMarginStatsByUser(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<MarginStats> {
    if (!userId) {
      throw new Error("userId is required");
    }

    // Construire la requête avec les coûts
    let query = supabase
      .from("interventions")
      .select(
        `
        id,
        id_inter,
        intervention_costs (
          id,
          cost_type,
          amount,
          label
        )
        `
      )
      .eq("assigned_user_id", userId)
      .eq("is_active", true); // Seulement les interventions actives

    // Appliquer les filtres de date si fournis
    if (startDate) {
      query = query.gte("date", startDate);
    }
    if (endDate) {
      query = query.lte("date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(
        `Erreur lors de la récupération des statistiques de marge: ${error.message}`
      );
    }

    let totalRevenue = 0;
    let totalCosts = 0;
    let totalMargin = 0;
    let interventionsWithCosts = 0;

    // Parcourir les interventions et calculer les marges
    (data || []).forEach((intervention: any) => {
      const marginCalc = this.calculateMarginForIntervention(
        intervention.intervention_costs || [],
        intervention.id_inter || intervention.id
      );

      if (marginCalc) {
        totalRevenue += marginCalc.revenue;
        totalCosts += marginCalc.costs;
        totalMargin += marginCalc.margin;
        interventionsWithCosts++;
      }
    });

    // ✅ CORRECTION : Calculer le pourcentage global (pas la moyenne des pourcentages)
    let averageMarginPercentage = 0;
    if (totalRevenue > 0) {
      averageMarginPercentage = (totalMargin / totalRevenue) * 100;
    }

    // Debug : vérifier la cohérence des calculs
    console.log(`[MarginStats] Résumé du calcul pour user ${userId} :`);
    console.log(`  - Nombre d'interventions : ${interventionsWithCosts}`);
    console.log(`  - Revenu total : ${totalRevenue.toFixed(2)}€`);
    console.log(`  - Coûts totaux : ${totalCosts.toFixed(2)}€`);
    console.log(`  - Marge totale : ${totalMargin.toFixed(2)}€`);
    console.log(`  - % marge global : ${averageMarginPercentage.toFixed(2)}%`);

    return {
      average_margin_percentage: Math.round(averageMarginPercentage * 100) / 100,
      total_interventions: interventionsWithCosts,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      total_costs: Math.round(totalCosts * 100) / 100,
      total_margin: Math.round(totalMargin * 100) / 100,
      period: {
        start_date: startDate || null,
        end_date: endDate || null,
      },
    };
  },

  /**
   * Récupère le classement des gestionnaires par marge totale sur une période
   * @param startDate - Date de début (optionnelle, format ISO string)
   * @param endDate - Date de fin (optionnelle, format ISO string)
   * @returns Classement des gestionnaires trié par marge totale décroissante
   */
  async getMarginRankingByPeriod(
    startDate?: string,
    endDate?: string
  ): Promise<MarginRankingResult> {
    // Récupérer tous les utilisateurs (gestionnaires)
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, firstname, lastname, code_gestionnaire, color")
      .order("lastname", { ascending: true });

    if (usersError) {
      throw new Error(`Erreur lors de la récupération des utilisateurs: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      return {
        rankings: [],
        period: {
          start_date: startDate || null,
          end_date: endDate || null,
        },
      };
    }

    // Pour chaque gestionnaire, calculer sa marge totale
    const rankings: GestionnaireMarginRanking[] = [];

    for (const user of users) {
      try {
        // Construire la requête avec les coûts pour ce gestionnaire
        let query = supabase
          .from("interventions")
          .select(
            `
            id,
            id_inter,
            intervention_costs (
              id,
              cost_type,
              amount,
              label
            )
            `
          )
          .eq("assigned_user_id", user.id)
          .eq("is_active", true);

        // Appliquer les filtres de date si fournis
        if (startDate) {
          query = query.gte("date", startDate);
        }
        if (endDate) {
          query = query.lte("date", endDate);
        }

        const { data: interventions, error: interventionsError } = await query;

        if (interventionsError) {
          console.warn(`Erreur pour l'utilisateur ${user.id}:`, interventionsError);
          continue;
        }

        let totalRevenue = 0;
        let totalCosts = 0;
        let totalMargin = 0;
        let interventionsWithCosts = 0;

        // Parcourir les interventions et calculer les marges
        (interventions || []).forEach((intervention: any) => {
          const marginCalc = this.calculateMarginForIntervention(
            intervention.intervention_costs || [],
            intervention.id_inter || intervention.id
          );

          if (marginCalc) {
            totalRevenue += marginCalc.revenue;
            totalCosts += marginCalc.costs;
            totalMargin += marginCalc.margin;
            interventionsWithCosts++;
          }
        });

        // ✅ CORRECTION : Calculer le pourcentage global
        let averageMarginPercentage = 0;
        if (totalRevenue > 0) {
          averageMarginPercentage = (totalMargin / totalRevenue) * 100;
        }

        // Ajouter au classement seulement si le gestionnaire a des interventions avec coûts
        if (interventionsWithCosts > 0) {
          const fullName = `${user.firstname || ""} ${user.lastname || ""}`.trim() || user.code_gestionnaire || "Utilisateur";

          rankings.push({
            user_id: user.id,
            user_name: fullName,
            user_code: user.code_gestionnaire,
            user_color: user.color,
            total_margin: Math.round(totalMargin * 100) / 100,
            total_interventions: interventionsWithCosts,
            average_margin_percentage: Math.round(averageMarginPercentage * 100) / 100,
            rank: 0, // Sera calculé après le tri
          });
        }
      } catch (error: any) {
        console.warn(`Erreur lors du calcul de la marge pour ${user.id}:`, error);
        continue;
      }
    }

    // Trier par marge totale décroissante
    rankings.sort((a, b) => b.total_margin - a.total_margin);

    // Assigner les rangs
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });

    return {
      rankings,
      period: {
        start_date: startDate || null,
        end_date: endDate || null,
      },
    };
  },

  /**
   * Récupère les statistiques hebdomadaires pour un utilisateur (semaine en cours)
   * @param userId - ID de l'utilisateur
   * @param weekStartDate - Date de début de la semaine (optionnelle, lundi de la semaine en cours par défaut)
   * @returns Statistiques par jour de la semaine (Lundi à Vendredi)
   */
  async getWeeklyStatsByUser(
    userId: string,
    weekStartDate?: string
  ): Promise<WeeklyStats> {
    if (!userId) {
      throw new Error("userId is required");
    }

    // Calculer les dates de la semaine (lundi à vendredi)
    let monday: Date;
    if (weekStartDate) {
      monday = new Date(weekStartDate);
      monday.setHours(0, 0, 0, 0);
    } else {
      // Trouver le lundi de la semaine en cours
      const now = new Date();
      const day = now.getDay(); // 0 = dimanche, 1 = lundi, ..., 6 = samedi
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Ajuster pour que lundi = 1
      monday = new Date(now.getFullYear(), now.getMonth(), diff);
      monday.setHours(0, 0, 0, 0);
      
      console.log(`[WeeklyStats] Date actuelle: ${now.toISOString()}, Jour de la semaine: ${day}, Diff: ${diff}`);
      console.log(`[WeeklyStats] Lundi calculé: ${monday.toISOString()}`);
    }

    const tuesday = new Date(monday);
    tuesday.setDate(monday.getDate() + 1);
    const wednesday = new Date(monday);
    wednesday.setDate(monday.getDate() + 2);
    const thursday = new Date(monday);
    thursday.setDate(monday.getDate() + 3);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);

    // Formater les dates pour les requêtes (YYYY-MM-DD)
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const mondayStr = formatDate(monday);
    const tuesdayStr = formatDate(tuesday);
    const wednesdayStr = formatDate(wednesday);
    const thursdayStr = formatDate(thursday);
    const fridayStr = formatDate(friday);
    const saturdayStr = formatDate(saturday); // Pour la fin de vendredi

    // Récupérer les statuts d'intervention nécessaires
    const { data: statuses, error: statusError } = await supabase
      .from("intervention_statuses")
      .select("id, code")
      .in("code", ["DEVIS_ENVOYE", "INTER_EN_COURS", "INTER_TERMINEE"]);

    if (statusError) {
      throw new Error(`Erreur lors de la récupération des statuts: ${statusError.message}`);
    }

    const statusMap = new Map(statuses?.map((s: any) => [s.code, s.id]) || []);

    // Fonction helper pour initialiser les stats d'un jour
    const initDayStats = (): WeekDayStats => ({
      lundi: 0,
      mardi: 0,
      mercredi: 0,
      jeudi: 0,
      vendredi: 0,
      total: 0,
    });

    // Initialiser les compteurs
    const devisEnvoye = initDayStats();
    const interEnCours = initDayStats();
    const interFactures = initDayStats();
    const nouveauxArtisans = initDayStats();

    // Récupérer les interventions de l'utilisateur pour la semaine
    const { data: interventions, error: interventionsError } = await supabase
      .from("interventions")
      .select(`
        id,
        date,
        statut_id,
        status:intervention_statuses(code)
      `)
      .eq("assigned_user_id", userId)
      .eq("is_active", true)
      .gte("date", mondayStr)
      .lt("date", saturdayStr); // Jusqu'à la fin de vendredi

    if (interventionsError) {
      throw new Error(`Erreur lors de la récupération des interventions: ${interventionsError.message}`);
    }

    // Debug: vérifier si des interventions ont été trouvées
    console.log(`[WeeklyStats] Période: ${mondayStr} à ${saturdayStr}`);
    console.log(`[WeeklyStats] UserId: ${userId}`);
    console.log(`[WeeklyStats] Interventions trouvées: ${interventions?.length || 0}`);
    
    // Vérifier toutes les interventions de l'utilisateur (sans filtre de date) pour debug
    const { data: allUserInterventions, count: totalCount } = await supabase
      .from("interventions")
      .select("id, date, assigned_user_id", { count: "exact" })
      .eq("assigned_user_id", userId)
      .eq("is_active", true)
      .limit(10);
    
    console.log(`[WeeklyStats] Total interventions pour cet utilisateur (sans filtre date): ${totalCount ?? 0}`);
    if (allUserInterventions && allUserInterventions.length > 0) {
      console.log(`[WeeklyStats] Exemples de dates d'interventions:`, 
        allUserInterventions.map(i => ({ id: i.id, date: i.date }))
      );
    }
    
    if (interventions && interventions.length > 0) {
      const firstIntervention = interventions[0] as any;
      console.log(`[WeeklyStats] Exemple d'intervention dans la période:`, {
        date: firstIntervention.date,
        statusCode: firstIntervention.status?.code,
      });
    }

    // Compter les interventions par jour et par statut
    (interventions || []).forEach((intervention: any) => {
      const interventionDate = new Date(intervention.date);
      const dateStr = formatDate(interventionDate);
      const statusCode = intervention.status?.code;

      if (!statusCode) {
        console.log(`[WeeklyStats] Intervention sans statut:`, intervention.id);
        return;
      }

      let dayKey: keyof WeekDayStats | null = null;
      if (dateStr === mondayStr) dayKey = "lundi";
      else if (dateStr === tuesdayStr) dayKey = "mardi";
      else if (dateStr === wednesdayStr) dayKey = "mercredi";
      else if (dateStr === thursdayStr) dayKey = "jeudi";
      else if (dateStr === fridayStr) dayKey = "vendredi";

      if (!dayKey) {
        console.log(`[WeeklyStats] Date hors période: ${dateStr} (attendu: ${mondayStr}-${fridayStr})`);
        return;
      }

      // Compter selon le statut
      if (statusCode === "DEVIS_ENVOYE") {
        devisEnvoye[dayKey]++;
        devisEnvoye.total++;
      } else if (statusCode === "INTER_EN_COURS" || statusCode === "EN_COURS") {
        interEnCours[dayKey]++;
        interEnCours.total++;
      } else if (statusCode === "INTER_TERMINEE" || statusCode === "TERMINE") {
        interFactures[dayKey]++;
        interFactures.total++;
      } else {
        console.log(`[WeeklyStats] Statut non compté: ${statusCode} pour intervention ${intervention.id}`);
      }
    });

    // Récupérer les artisans créés par l'utilisateur pour la semaine
    const { data: artisans, error: artisansError } = await supabase
      .from("artisans")
      .select("id, date_ajout, created_at, gestionnaire_id")
      .eq("gestionnaire_id", userId)
      .eq("is_active", true)
      .gte("date_ajout", mondayStr)
      .lt("date_ajout", saturdayStr);

    if (artisansError) {
      throw new Error(`Erreur lors de la récupération des artisans: ${artisansError.message}`);
    }

    // Compter les artisans par jour
    (artisans || []).forEach((artisan: any) => {
      // Utiliser date_ajout en priorité, sinon created_at
      const artisanDate = artisan.date_ajout 
        ? new Date(artisan.date_ajout)
        : artisan.created_at 
        ? new Date(artisan.created_at)
        : null;

      if (!artisanDate) return;

      const dateStr = formatDate(artisanDate);
      let dayKey: keyof WeekDayStats | null = null;
      if (dateStr === mondayStr) dayKey = "lundi";
      else if (dateStr === tuesdayStr) dayKey = "mardi";
      else if (dateStr === wednesdayStr) dayKey = "mercredi";
      else if (dateStr === thursdayStr) dayKey = "jeudi";
      else if (dateStr === fridayStr) dayKey = "vendredi";

      if (dayKey) {
        nouveauxArtisans[dayKey]++;
        nouveauxArtisans.total++;
      }
    });

    return {
      devis_envoye: devisEnvoye,
      inter_en_cours: interEnCours,
      inter_factures: interFactures,
      nouveaux_artisans: nouveauxArtisans,
      week_start: monday.toISOString(),
      week_end: friday.toISOString(),
    };
  },

  /**
   * Récupère les statistiques par période pour un utilisateur (semaine, mois ou année)
   * @param userId - ID de l'utilisateur
   * @param period - Type de période ("week", "month", "year")
   * @param startDate - Date de début (optionnelle, période en cours par défaut)
   * @returns Statistiques selon la période choisie
   */
  async getPeriodStatsByUser(
    userId: string,
    period: StatsPeriod,
    startDate?: string
  ): Promise<WeeklyStats | MonthlyStats | YearlyStats> {
    if (!userId) {
      throw new Error("userId is required");
    }

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    if (period === "week") {
      return this.getWeeklyStatsByUser(userId, startDate);
    }

    if (period === "month") {
      // Calculer le mois (mois en cours par défaut)
      let monthStart: Date;
      if (startDate) {
        monthStart = new Date(startDate);
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
      } else {
        const now = new Date();
        monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);
      }

      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);
      const monthStartStr = formatDate(monthStart);
      const monthEndStr = formatDate(monthEnd);

      // Calculer les semaines du mois
      const weeks: { start: Date; end: Date }[] = [];
      let currentWeekStart = new Date(monthStart);
      
      // Trouver le lundi de la première semaine
      const firstDay = currentWeekStart.getDay();
      const diffToMonday = firstDay === 0 ? -6 : 1 - firstDay;
      currentWeekStart.setDate(currentWeekStart.getDate() + diffToMonday);

      while (currentWeekStart <= monthEnd) {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(currentWeekStart.getDate() + 4); // Vendredi
        
        if (currentWeekStart <= monthEnd) {
          weeks.push({
            start: new Date(currentWeekStart),
            end: weekEnd <= monthEnd ? weekEnd : monthEnd,
          });
        }
        
        currentWeekStart.setDate(currentWeekStart.getDate() + 7); // Semaine suivante
      }

      // Initialiser les stats par semaine
      const initWeekStats = (): MonthWeekStats => ({
        semaine1: 0,
        semaine2: 0,
        semaine3: 0,
        semaine4: 0,
        semaine5: 0,
        total: 0,
      });

      const devisEnvoye = initWeekStats();
      const interEnCours = initWeekStats();
      const interFactures = initWeekStats();
      const nouveauxArtisans = initWeekStats();

      // Récupérer les interventions du mois
      const { data: interventions, error: interventionsError } = await supabase
        .from("interventions")
        .select(`
          id,
          date,
          statut_id,
          status:intervention_statuses(code)
        `)
        .eq("assigned_user_id", userId)
        .eq("is_active", true)
        .gte("date", monthStartStr)
        .lte("date", monthEndStr);

      if (interventionsError) {
        throw new Error(`Erreur lors de la récupération des interventions: ${interventionsError.message}`);
      }

      // Compter par semaine
      (interventions || []).forEach((intervention: any) => {
        const interventionDate = new Date(intervention.date);
        const statusCode = intervention.status?.code;
        if (!statusCode) return;

        // Trouver dans quelle semaine tombe cette intervention
        for (let i = 0; i < weeks.length && i < 5; i++) {
          const week = weeks[i];
          if (interventionDate >= week.start && interventionDate <= week.end) {
            const weekKey = `semaine${i + 1}` as keyof MonthWeekStats;
            
            if (statusCode === "DEVIS_ENVOYE") {
              devisEnvoye[weekKey]++;
              devisEnvoye.total++;
            } else if (statusCode === "INTER_EN_COURS" || statusCode === "EN_COURS") {
              interEnCours[weekKey]++;
              interEnCours.total++;
            } else if (statusCode === "INTER_TERMINEE" || statusCode === "TERMINE") {
              interFactures[weekKey]++;
              interFactures.total++;
            }
            break;
          }
        }
      });

      // Récupérer les artisans du mois
      const { data: artisans, error: artisansError } = await supabase
        .from("artisans")
        .select("id, date_ajout, created_at, gestionnaire_id")
        .eq("gestionnaire_id", userId)
        .eq("is_active", true)
        .gte("date_ajout", monthStartStr)
        .lte("date_ajout", monthEndStr);

      if (artisansError) {
        throw new Error(`Erreur lors de la récupération des artisans: ${artisansError.message}`);
      }

      // Compter les artisans par semaine
      (artisans || []).forEach((artisan: any) => {
        const artisanDate = artisan.date_ajout 
          ? new Date(artisan.date_ajout)
          : artisan.created_at 
          ? new Date(artisan.created_at)
          : null;

        if (!artisanDate) return;

        for (let i = 0; i < weeks.length && i < 5; i++) {
          const week = weeks[i];
          if (artisanDate >= week.start && artisanDate <= week.end) {
            const weekKey = `semaine${i + 1}` as keyof MonthWeekStats;
            nouveauxArtisans[weekKey]++;
            nouveauxArtisans.total++;
            break;
          }
        }
      });

      return {
        devis_envoye: devisEnvoye,
        inter_en_cours: interEnCours,
        inter_factures: interFactures,
        nouveaux_artisans: nouveauxArtisans,
        month_start: monthStart.toISOString(),
        month_end: monthEnd.toISOString(),
        month: monthStart.getMonth() + 1,
        year: monthStart.getFullYear(),
      };
    }

    if (period === "year") {
      // Calculer l'année (année en cours par défaut)
      let yearStart: Date;
      if (startDate) {
        yearStart = new Date(startDate);
        yearStart.setMonth(0, 1);
        yearStart.setHours(0, 0, 0, 0);
      } else {
        const now = new Date();
        yearStart = new Date(now.getFullYear(), 0, 1);
        yearStart.setHours(0, 0, 0, 0);
      }

      const yearEnd = new Date(yearStart.getFullYear(), 11, 31, 23, 59, 59);
      const yearStartStr = formatDate(yearStart);
      const yearEndStr = formatDate(yearEnd);

      // Initialiser les stats par mois
      const initMonthStats = (): YearMonthStats => ({
        janvier: 0,
        fevrier: 0,
        mars: 0,
        avril: 0,
        mai: 0,
        juin: 0,
        juillet: 0,
        aout: 0,
        septembre: 0,
        octobre: 0,
        novembre: 0,
        decembre: 0,
        total: 0,
      });

      const devisEnvoye = initMonthStats();
      const interEnCours = initMonthStats();
      const interFactures = initMonthStats();
      const nouveauxArtisans = initMonthStats();

      const monthNames: (keyof YearMonthStats)[] = [
        "janvier", "fevrier", "mars", "avril", "mai", "juin",
        "juillet", "aout", "septembre", "octobre", "novembre", "decembre"
      ];

      // Récupérer les interventions de l'année
      const { data: interventions, error: interventionsError } = await supabase
        .from("interventions")
        .select(`
          id,
          date,
          statut_id,
          status:intervention_statuses(code)
        `)
        .eq("assigned_user_id", userId)
        .eq("is_active", true)
        .gte("date", yearStartStr)
        .lte("date", yearEndStr);

      if (interventionsError) {
        throw new Error(`Erreur lors de la récupération des interventions: ${interventionsError.message}`);
      }

      // Compter par mois
      (interventions || []).forEach((intervention: any) => {
        const interventionDate = new Date(intervention.date);
        const monthIndex = interventionDate.getMonth();
        const monthKey = monthNames[monthIndex];
        const statusCode = intervention.status?.code;
        if (!statusCode || !monthKey) return;

        if (statusCode === "DEVIS_ENVOYE") {
          devisEnvoye[monthKey]++;
          devisEnvoye.total++;
        } else if (statusCode === "INTER_EN_COURS" || statusCode === "EN_COURS") {
          interEnCours[monthKey]++;
          interEnCours.total++;
        } else if (statusCode === "INTER_TERMINEE" || statusCode === "TERMINE") {
          interFactures[monthKey]++;
          interFactures.total++;
        }
      });

      // Récupérer les artisans de l'année
      const { data: artisans, error: artisansError } = await supabase
        .from("artisans")
        .select("id, date_ajout, created_at, gestionnaire_id")
        .eq("gestionnaire_id", userId)
        .eq("is_active", true)
        .gte("date_ajout", yearStartStr)
        .lte("date_ajout", yearEndStr);

      if (artisansError) {
        throw new Error(`Erreur lors de la récupération des artisans: ${artisansError.message}`);
      }

      // Compter les artisans par mois
      (artisans || []).forEach((artisan: any) => {
        const artisanDate = artisan.date_ajout 
          ? new Date(artisan.date_ajout)
          : artisan.created_at 
          ? new Date(artisan.created_at)
          : null;

        if (!artisanDate) return;

        const monthIndex = artisanDate.getMonth();
        const monthKey = monthNames[monthIndex];
        if (monthKey) {
          nouveauxArtisans[monthKey]++;
          nouveauxArtisans.total++;
        }
      });

      return {
        devis_envoye: devisEnvoye,
        inter_en_cours: interEnCours,
        inter_factures: interFactures,
        nouveaux_artisans: nouveauxArtisans,
        year_start: yearStart.toISOString(),
        year_end: yearEnd.toISOString(),
        year: yearStart.getFullYear(),
      };
    }

    throw new Error(`Période non supportée: ${period}`);
  },
};
