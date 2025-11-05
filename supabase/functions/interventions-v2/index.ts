// ===== API INTERVENTIONS COMPLÈTE ET SCALABLE =====
// Service API Supabase - CRUD complet pour les interventions
// 
// FEATURES:
// - CRUD complet (Create, Read, Update, Delete)
// - Assignation d'artisans par gestionnaire
// - Gestion des commentaires
// - Gestion des documents/attachments
// - Gestion des coûts et paiements
// - Pagination optimisée
// - Validation des données
// - Gestion d'erreurs robuste

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Types pour la validation
interface CreateInterventionRequest {
  id_inter?: string;
  agence_id?: string;
  client_id?: string;
  tenant_id?: string;
  owner_id?: string;
  assigned_user_id?: string;
  statut_id?: string;
  metier_id?: string;
  date: string;
  date_prevue?: string;
  contexte_intervention?: string;
  consigne_intervention?: string;
  consigne_second_artisan?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  latitude?: number;
  longitude?: number;
  numero_sst?: string;
  pourcentage_sst?: number;
}

interface UpdateInterventionRequest {
  id_inter?: string;
  agence_id?: string;
  client_id?: string;
  tenant_id?: string;
  owner_id?: string;
  assigned_user_id?: string;
  statut_id?: string;
  metier_id?: string;
  date?: string;
  date_termine?: string;
  date_prevue?: string;
  contexte_intervention?: string;
  consigne_intervention?: string;
  consigne_second_artisan?: string;
  commentaire_agent?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  latitude?: number;
  longitude?: number;
  numero_sst?: string;
  pourcentage_sst?: number;
  is_active?: boolean;
}

interface AssignArtisanRequest {
  intervention_id: string;
  artisan_id: string;
  role?: 'primary' | 'secondary';
  is_primary?: boolean;
}

interface CreateCommentRequest {
  intervention_id: string;
  content: string;
  comment_type?: string;
  is_internal?: boolean;
}

interface CreateAttachmentRequest {
  intervention_id: string;
  kind: string;
  url: string;
  filename?: string;
  mime_type?: string;
  file_size?: number;
}

interface CreateCostRequest {
  intervention_id: string;
  cost_type: 'sst' | 'materiel' | 'intervention' | 'total';
  label?: string;
  amount: number;
  currency?: string;
  metadata?: any;
}

interface CreatePaymentRequest {
  intervention_id: string;
  payment_type: string;
  amount: number;
  currency?: string;
  is_received?: boolean;
  payment_date?: string;
  reference?: string;
}

const TERMINATED_INTERVENTION_CODES = ['TERMINE', 'INTER_TERMINEE'];
const ARTISAN_LEVEL_CODES = ['NOVICE', 'FORMATION', 'CONFIRME', 'EXPERT'];

async function handleInterventionCompletionSideEffects(
  supabase: SupabaseClient,
  intervention: { id: string; statut_id?: string | null },
  requestId: string,
) {
  if (!intervention?.id || !intervention?.statut_id) {
    return;
  }

  try {
    const { data: terminatedStatuses, error: terminatedStatusError } = await supabase
      .from('intervention_statuses')
      .select('id, code')
      .in('code', TERMINATED_INTERVENTION_CODES);

    if (terminatedStatusError) {
      console.error(
        JSON.stringify({
          level: 'error',
          requestId,
          interventionId: intervention.id,
          message: 'Failed to load terminated intervention statuses',
          error: terminatedStatusError.message,
        }),
      );
      return;
    }

    const terminatedStatusIds = new Set(
      (terminatedStatuses ?? [])
        .filter((row) => row?.id)
        .map((row) => row.id as string),
    );

    if (!terminatedStatusIds.has(intervention.statut_id)) {
      return;
    }

    const { data: artisanLinks, error: artisanLinkError } = await supabase
      .from('intervention_artisans')
      .select('artisan_id, is_primary')
      .eq('intervention_id', intervention.id);

    if (artisanLinkError) {
      console.error(
        JSON.stringify({
          level: 'error',
          requestId,
          interventionId: intervention.id,
          message: 'Failed to load intervention artisans',
          error: artisanLinkError.message,
        }),
      );
      return;
    }

    if (!artisanLinks || artisanLinks.length === 0) {
      return;
    }

    let artisanIds = artisanLinks
      .filter((link) => link && link.is_primary === true && link.artisan_id)
      .map((link) => link.artisan_id as string);

    if (artisanIds.length === 0) {
      artisanIds = artisanLinks
        .filter((link) => link?.artisan_id)
        .map((link) => link.artisan_id as string);
    }

    artisanIds = Array.from(new Set(artisanIds));

    if (artisanIds.length === 0) {
      return;
    }

    const { data: artisanStatuses, error: artisanStatusError } = await supabase
      .from('artisan_statuses')
      .select('id, code');

    if (artisanStatusError) {
      console.error(
        JSON.stringify({
          level: 'error',
          requestId,
          interventionId: intervention.id,
          message: 'Failed to load artisan statuses',
          error: artisanStatusError.message,
        }),
      );
      return;
    }

    const codeToStatusId = new Map<string, string>();
    const statusIdToCode = new Map<string, string>();

    for (const status of artisanStatuses ?? []) {
      if (status?.code && status?.id) {
        const upperCode = (status.code as string).toUpperCase();
        codeToStatusId.set(upperCode, status.id as string);
        statusIdToCode.set(status.id as string, upperCode);
      }
    }

    const missingCodes = ARTISAN_LEVEL_CODES.filter(
      (code) => !codeToStatusId.has(code),
    );

    if (missingCodes.length === ARTISAN_LEVEL_CODES.length) {
      // Aucun statut cible n'est disponible, inutile de continuer
      console.warn(
        JSON.stringify({
          level: 'warn',
          requestId,
          interventionId: intervention.id,
          message:
            'Automatic artisan status update skipped because no target status codes are available',
          missingCodes,
        }),
      );
      return;
    }

    for (const artisanId of artisanIds) {
      const { data: artisan, error: artisanError } = await supabase
        .from('artisans')
        .select('id, statut_id')
        .eq('id', artisanId)
        .single();

      if (artisanError || !artisan) {
        console.error(
          JSON.stringify({
            level: 'error',
            requestId,
            interventionId: intervention.id,
            artisanId,
            message: 'Failed to load artisan for status update',
            error: artisanError?.message ?? 'NOT_FOUND',
          }),
        );
        continue;
      }

      const { data: linkedInterventions, error: linkedError } = await supabase
        .from('intervention_artisans')
        .select('intervention_id')
        .eq('artisan_id', artisanId)
        .eq('is_primary', true);

      if (linkedError) {
        console.error(
          JSON.stringify({
            level: 'error',
            requestId,
            interventionId: intervention.id,
            artisanId,
            message: 'Failed to load artisan interventions',
            error: linkedError.message,
          }),
        );
        continue;
      }

      const interventionIds = (linkedInterventions ?? [])
        .map((row) => row?.intervention_id as string | null)
        .filter((value): value is string => Boolean(value));

      if (interventionIds.length === 0) {
        continue;
      }

      const { count: completedCount, error: countError } = await supabase
        .from('interventions')
        .select('id', { count: 'exact', head: true })
        .in('id', interventionIds)
        .in('statut_id', Array.from(terminatedStatusIds));

      if (countError) {
        console.error(
          JSON.stringify({
            level: 'error',
            requestId,
            interventionId: intervention.id,
            artisanId,
            message: 'Failed to count completed interventions for artisan',
            error: countError.message,
          }),
        );
        continue;
      }

      const completed = completedCount ?? 0;
      const currentCode = artisan.statut_id
        ? statusIdToCode.get(artisan.statut_id as string) ?? null
        : null;

      let nextCode = currentCode;

      if (completed >= 10) {
        nextCode = 'EXPERT';
      } else if (completed >= 6) {
        nextCode = 'CONFIRME';
      } else if (completed >= 3) {
        nextCode = 'FORMATION';
      } else if (completed >= 1) {
        nextCode = 'NOVICE';
      }

      if (!nextCode || nextCode === currentCode) {
        continue;
      }

      const nextStatusId = codeToStatusId.get(nextCode);
      if (!nextStatusId) {
        continue;
      }

      const { error: updateError } = await supabase
        .from('artisans')
        .update({
          statut_id: nextStatusId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', artisanId);

      if (updateError) {
        console.error(
          JSON.stringify({
            level: 'error',
            requestId,
            interventionId: intervention.id,
            artisanId,
            message: 'Failed to update artisan status',
            error: updateError.message,
          }),
        );
        continue;
      }

      console.log(
        JSON.stringify({
          level: 'info',
          requestId,
          interventionId: intervention.id,
          artisanId,
          previousStatus: currentCode,
          newStatus: nextCode,
          completedInterventions: completed,
          timestamp: new Date().toISOString(),
          message: 'Artisan status updated based on completed interventions',
        }),
      );
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        requestId,
        interventionId: intervention?.id ?? null,
        message: 'Unexpected error while updating artisan status',
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

serve(async (req: Request) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  console.log(JSON.stringify({
    level: 'info',
    requestId,
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    message: 'Interventions API request started'
  }));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(segment => segment);
    
    // Parsing plus robuste pour gérer les sous-ressources
    let resource = pathSegments[pathSegments.length - 1];
    let resourceId = null;
    
    // Pour /interventions-v2/interventions/{id}/artisans
    if (pathSegments.length >= 4 && pathSegments[pathSegments.length - 3] === 'interventions') {
      resourceId = pathSegments[pathSegments.length - 2];
      resource = pathSegments[pathSegments.length - 1];
    }
    // Pour /interventions-v2/interventions/{id}
    else if (pathSegments.length >= 3 && pathSegments[pathSegments.length - 2] === 'interventions') {
      resourceId = pathSegments[pathSegments.length - 1];
      resource = 'interventions';
    }
    // Pour /interventions-v2/interventions
    else if (pathSegments.length >= 2 && pathSegments[pathSegments.length - 1] === 'interventions') {
      resource = 'interventions';
    }

    // ===== GET /interventions - Liste toutes les interventions =====
    if (req.method === 'GET' && resource === 'interventions') {
      const statut = url.searchParams.get('statut');
      const agence = url.searchParams.get('agence');
      const artisan = url.searchParams.get('artisan');
      const user = url.searchParams.get('user');
      const startDate = url.searchParams.get('startDate');
      const endDate = url.searchParams.get('endDate');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const includeRelations = url.searchParams.get('include')?.split(',') || [];

      let query = supabase
        .from('interventions')
        .select(`
          id,
          id_inter,
          agence_id,
          tenant_id,
          owner_id,
          assigned_user_id,
          statut_id,
          metier_id,
          date,
          date_termine,
          date_prevue,
          due_date,
          contexte_intervention,
          consigne_intervention,
          consigne_second_artisan,
          commentaire_agent,
          adresse,
          code_postal,
          ville,
          latitude,
          longitude,
          is_active,
          created_at,
          updated_at
          ${includeRelations.includes('agencies') ? ',agencies(id,label,code)' : ''}
          ${
            includeRelations.includes('tenants') || includeRelations.includes('clients')
              ? ',tenants:tenant_id(id,firstname,lastname,email,telephone,telephone2)'
              : ''
          }
          ${includeRelations.includes('users') ? ',users!assigned_user_id(id,firstname,lastname,username)' : ''}
          ${includeRelations.includes('statuses') ? ',intervention_statuses(id,code,label,color)' : ''}
          ${includeRelations.includes('metiers') ? ',metiers(id,label,code)' : ''}
        `)
        .order('date', { ascending: false });

      // Appliquer les filtres
      if (statut) {
        query = query.eq('statut_id', statut);
      }
      if (agence) {
        query = query.eq('agence_id', agence);
      }
      if (user) {
        query = query.eq('assigned_user_id', user);
      }
      if (startDate && endDate) {
        query = query.gte('date', startDate).lte('date', endDate);
      }

      // Filtrer les interventions actives
      query = query.eq('is_active', true);

      // Compter le total
      const { count: totalCount } = await supabase
        .from('interventions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Appliquer pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Si artisan est spécifié, filtrer les interventions assignées à cet artisan
      let filteredData = data || [];
      if (artisan) {
        const { data: artisanInterventions } = await supabase
          .from('intervention_artisans')
          .select('intervention_id')
          .eq('artisan_id', artisan);
        
        const interventionIds = artisanInterventions?.map(ia => ia.intervention_id) || [];
        filteredData = filteredData.filter(intervention => interventionIds.includes(intervention.id));
      }

      const responseTime = Date.now() - startTime;
      
      console.log(JSON.stringify({
        level: 'info',
        requestId,
        responseTime,
        dataCount: filteredData.length,
        timestamp: new Date().toISOString(),
        message: 'Interventions list retrieved successfully'
      }));

      return new Response(
        JSON.stringify({
          data: filteredData,
          pagination: {
            limit,
            offset,
            total: totalCount || 0,
            hasMore: filteredData.length === limit
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== GET /interventions/{id} - Intervention par ID =====
    if (req.method === 'GET' && resourceId && resource === 'interventions') {
      const includeRelations = url.searchParams.get('include')?.split(',') || [];

      const { data, error } = await supabase
        .from('interventions')
        .select(`
          id,
          id_inter,
          agence_id,
          tenant_id,
          owner_id,
          assigned_user_id,
          statut_id,
          metier_id,
          date,
          date_termine,
          date_prevue,
          due_date,
          contexte_intervention,
          consigne_intervention,
          consigne_second_artisan,
          commentaire_agent,
          adresse,
          code_postal,
          ville,
          latitude,
          longitude,
          is_active,
          created_at,
          updated_at
          ${includeRelations.includes('agencies') ? ',agencies(id,label,code)' : ''}
          ${
            includeRelations.includes('tenants') || includeRelations.includes('clients')
              ? ',tenants:tenant_id(id,firstname,lastname,email,telephone,telephone2)'
              : ''
          }
          ${includeRelations.includes('users') ? ',users!assigned_user_id(id,firstname,lastname,username)' : ''}
          ${includeRelations.includes('statuses') ? ',intervention_statuses(id,code,label,color)' : ''}
          ${includeRelations.includes('metiers') ? ',metiers(id,label,code)' : ''}
          ${includeRelations.includes('artisans') ? ',intervention_artisans(artisan_id,role,is_primary,artisans(id,prenom,nom,telephone,email))' : ''}
          ${includeRelations.includes('costs') ? ',intervention_costs(id,cost_type,label,amount,currency,created_at)' : ''}
          ${includeRelations.includes('payments') ? ',intervention_payments(id,payment_type,amount,is_received,payment_date,reference)' : ''}
          ${includeRelations.includes('attachments') ? ',intervention_attachments(id,kind,url,filename,mime_type,file_size)' : ''}
          ${includeRelations.includes('comments') ? ',comments(id,content,comment_type,is_internal,created_at,users!author_id(firstname,lastname))' : ''}
        `)
        .eq('id', resourceId)
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Intervention not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== POST /interventions/upsert - Upsert une intervention =====
    if (req.method === 'POST' && resource === 'interventions' && resourceId === 'upsert') {
      const body: CreateInterventionRequest = await req.json();

      // Validation des données requises
      if (!body.date) {
        return new Response(
          JSON.stringify({ error: 'Date is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Si id_inter est fourni, chercher l'intervention existante
      if (body.id_inter) {
        const { data: existing, error: findError } = await supabase
          .from('interventions')
          .select('id')
          .eq('id_inter', body.id_inter)
          .single();

        if (findError && findError.code !== 'PGRST116') { // PGRST116 = not found
          throw new Error(`Failed to search intervention: ${findError.message}`);
        }

        if (existing) {
          // Mettre à jour l'intervention existante
          const { data, error } = await supabase
            .from('interventions')
            .update({
              agence_id: body.agence_id,
              tenant_id: body.tenant_id ?? body.client_id ?? null,
              owner_id: body.owner_id ?? null,
              assigned_user_id: body.assigned_user_id,
              statut_id: body.statut_id,
              metier_id: body.metier_id,
              date: body.date,
              date_prevue: body.date_prevue,
              contexte_intervention: body.contexte_intervention,
              consigne_intervention: body.consigne_intervention,
              consigne_second_artisan: body.consigne_second_artisan,
              adresse: body.adresse,
              code_postal: body.code_postal,
              ville: body.ville,
              latitude: body.latitude,
              longitude: body.longitude,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select()
            .single();

          if (error) {
            throw new Error(`Failed to update intervention: ${error.message}`);
          }

          console.log(JSON.stringify({
            level: 'info',
            requestId,
            interventionId: data.id,
            idInter: data.id_inter,
            timestamp: new Date().toISOString(),
            message: 'Intervention updated via upsert'
          }));

          await handleInterventionCompletionSideEffects(supabase, data, requestId);

          return new Response(
            JSON.stringify(data),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Créer une nouvelle intervention
      const { data, error } = await supabase
        .from('interventions')
        .insert([{
          id_inter: body.id_inter,
          agence_id: body.agence_id,
          tenant_id: body.tenant_id ?? body.client_id ?? null,
          owner_id: body.owner_id ?? null,
          assigned_user_id: body.assigned_user_id,
          statut_id: body.statut_id,
          metier_id: body.metier_id,
          date: body.date,
          date_prevue: body.date_prevue,
          contexte_intervention: body.contexte_intervention,
          consigne_intervention: body.consigne_intervention,
          consigne_second_artisan: body.consigne_second_artisan,
          adresse: body.adresse,
          code_postal: body.code_postal,
          ville: body.ville,
          latitude: body.latitude,
          longitude: body.longitude,
          is_active: true
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create intervention: ${error.message}`);
      }

      console.log(JSON.stringify({
        level: 'info',
        requestId,
        interventionId: data.id,
        idInter: data.id_inter,
        timestamp: new Date().toISOString(),
        message: 'Intervention created via upsert'
      }));

      await handleInterventionCompletionSideEffects(supabase, data, requestId);

      return new Response(
        JSON.stringify(data),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== POST /interventions - Créer une intervention =====
    if (req.method === 'POST' && resource === 'interventions') {
      const body: CreateInterventionRequest = await req.json();

      // Validation des données requises
      if (!body.date) {
        return new Response(
          JSON.stringify({ error: 'Date is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('interventions')
        .insert([{
          id_inter: body.id_inter,
          agence_id: body.agence_id,
          tenant_id: body.tenant_id ?? body.client_id ?? null,
          owner_id: body.owner_id ?? null,
          assigned_user_id: body.assigned_user_id,
          statut_id: body.statut_id,
          metier_id: body.metier_id,
          date: body.date,
          date_prevue: body.date_prevue,
          contexte_intervention: body.contexte_intervention,
          consigne_intervention: body.consigne_intervention,
          consigne_second_artisan: body.consigne_second_artisan,
          adresse: body.adresse,
          code_postal: body.code_postal,
          ville: body.ville,
          latitude: body.latitude,
          longitude: body.longitude,
          is_active: true
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create intervention: ${error.message}`);
      }

      console.log(JSON.stringify({
        level: 'info',
        requestId,
        interventionId: data.id,
        timestamp: new Date().toISOString(),
        message: 'Intervention created successfully'
      }));

      await handleInterventionCompletionSideEffects(supabase, data, requestId);

      return new Response(
        JSON.stringify(data),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== PUT /interventions/{id} - Modifier une intervention =====
    if (req.method === 'PUT' && resourceId && resource === 'interventions') {
      const body: UpdateInterventionRequest = await req.json();

      const { data, error } = await supabase
        .from('interventions')
        .update({
          id_inter: body.id_inter,
          agence_id: body.agence_id,
          tenant_id: body.tenant_id ?? body.client_id ?? null,
          owner_id: body.owner_id ?? null,
          assigned_user_id: body.assigned_user_id,
          statut_id: body.statut_id,
          metier_id: body.metier_id,
          date: body.date,
          date_termine: body.date_termine,
          date_prevue: body.date_prevue,
          contexte_intervention: body.contexte_intervention,
          consigne_intervention: body.consigne_intervention,
          consigne_second_artisan: body.consigne_second_artisan,
          commentaire_agent: body.commentaire_agent,
          adresse: body.adresse,
          code_postal: body.code_postal,
          ville: body.ville,
          latitude: body.latitude,
          longitude: body.longitude,
          is_active: body.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', resourceId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update intervention: ${error.message}`);
      }

      console.log(JSON.stringify({
        level: 'info',
        requestId,
        interventionId: resourceId,
        timestamp: new Date().toISOString(),
        message: 'Intervention updated successfully'
      }));

      await handleInterventionCompletionSideEffects(supabase, data, requestId);

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== DELETE /interventions/{id} - Supprimer une intervention (soft delete) =====
    if (req.method === 'DELETE' && resourceId && resource === 'interventions') {
      const { data, error } = await supabase
        .from('interventions')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', resourceId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to delete intervention: ${error.message}`);
      }

      console.log(JSON.stringify({
        level: 'info',
        requestId,
        interventionId: resourceId,
        timestamp: new Date().toISOString(),
        message: 'Intervention deleted successfully'
      }));

      return new Response(
        JSON.stringify({ message: 'Intervention deleted successfully', data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== POST /interventions/{id}/artisans - Assigner un artisan =====
    if (req.method === 'POST' && resourceId && resource === 'artisans') {
      const body: AssignArtisanRequest = await req.json();

      if (!body.artisan_id) {
        return new Response(
          JSON.stringify({ error: 'artisan_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('intervention_artisans')
        .insert([{
          intervention_id: resourceId,
          artisan_id: body.artisan_id,
          role: body.role || 'primary',
          is_primary: body.is_primary ?? (body.role === 'primary')
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to assign artisan: ${error.message}`);
      }

      console.log(JSON.stringify({
        level: 'info',
        requestId,
        interventionId: resourceId,
        artisanId: body.artisan_id,
        timestamp: new Date().toISOString(),
        message: 'Artisan assigned successfully'
      }));

      return new Response(
        JSON.stringify(data),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== POST /interventions/{id}/comments - Ajouter un commentaire =====
    if (req.method === 'POST' && resourceId && resource === 'comments') {
      const body: CreateCommentRequest = await req.json();

      if (!body.content) {
        return new Response(
          JSON.stringify({ error: 'content is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('comments')
        .insert([{
          entity_id: resourceId,
          entity_type: 'intervention',
          content: body.content,
          comment_type: body.comment_type || 'internal',
          is_internal: body.is_internal ?? true
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create comment: ${error.message}`);
      }

      console.log(JSON.stringify({
        level: 'info',
        requestId,
        interventionId: resourceId,
        commentId: data.id,
        timestamp: new Date().toISOString(),
        message: 'Comment created successfully'
      }));

      return new Response(
        JSON.stringify(data),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== POST /interventions/{id}/attachments - Ajouter un document =====
    if (req.method === 'POST' && resourceId && resource === 'attachments') {
      const body: CreateAttachmentRequest = await req.json();

      if (!body.kind || !body.url) {
        return new Response(
          JSON.stringify({ error: 'kind and url are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('intervention_attachments')
        .insert([{
          intervention_id: resourceId,
          kind: body.kind,
          url: body.url,
          filename: body.filename,
          mime_type: body.mime_type,
          file_size: body.file_size
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create attachment: ${error.message}`);
      }

      console.log(JSON.stringify({
        level: 'info',
        requestId,
        interventionId: resourceId,
        attachmentId: data.id,
        timestamp: new Date().toISOString(),
        message: 'Attachment created successfully'
      }));

      return new Response(
        JSON.stringify(data),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== POST /interventions/{id}/costs - Ajouter un coût =====
    if (req.method === 'POST' && resourceId && resource === 'costs') {
      const body: CreateCostRequest = await req.json();

      if (!body.cost_type || body.amount === null || body.amount === undefined) {
        return new Response(
          JSON.stringify({ error: 'cost_type and amount are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('intervention_costs')
        .insert([{
          intervention_id: resourceId,
          cost_type: body.cost_type,
          label: body.label,
          amount: body.amount,
          currency: body.currency || 'EUR',
          metadata: body.metadata
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create cost: ${error.message}`);
      }

      console.log(JSON.stringify({
        level: 'info',
        requestId,
        interventionId: resourceId,
        costId: data.id,
        timestamp: new Date().toISOString(),
        message: 'Cost created successfully'
      }));

      return new Response(
        JSON.stringify(data),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== POST /interventions/{id}/payments - Ajouter un paiement =====
    if (req.method === 'POST' && resourceId && resource === 'payments') {
      const body: CreatePaymentRequest = await req.json();

      if (!body.payment_type || !body.amount) {
        return new Response(
          JSON.stringify({ error: 'payment_type and amount are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('intervention_payments')
        .insert([{
          intervention_id: resourceId,
          payment_type: body.payment_type,
          amount: body.amount,
          currency: body.currency || 'EUR',
          is_received: body.is_received ?? false,
          payment_date: body.payment_date,
          reference: body.reference
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create payment: ${error.message}`);
      }

      console.log(JSON.stringify({
        level: 'info',
        requestId,
        interventionId: resourceId,
        paymentId: data.id,
        timestamp: new Date().toISOString(),
        message: 'Payment created successfully'
      }));

      return new Response(
        JSON.stringify(data),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.log(JSON.stringify({
      level: 'error',
      requestId,
      responseTime,
      error: error.message,
      timestamp: new Date().toISOString(),
      message: 'Interventions API request failed'
    }));

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
