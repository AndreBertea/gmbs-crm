// ===== API INTERVENTIONS V2 =====
// Gestion complète des interventions

import { referenceApi } from "../../reference-api";
import { supabase } from "../../supabase-client";
import type {
  BulkOperationResult,
  CreateInterventionData,
  Intervention,
  InterventionCost,
  InterventionPayment,
  InterventionQueryParams,
  PaginatedResponse,
  UpdateInterventionData,
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
      cost_type: "sst" | "materiel" | "intervention" | "total";
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
      cost_type: "sst" | "materiel" | "intervention" | "total";
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
};
