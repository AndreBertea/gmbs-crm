// ===== API CLIENT COMPLET ET SCALABLE =====
// Service API Supabase - Client pour les nouvelles Edge Functions
//
// FEATURES:
// - API complète pour interventions, artisans, documents, commentaires
// - CRUD complet avec validation
// - Gestion des relations et jointures
// - Upload de documents
// - Assignation d'artisans
// - Gestion des coûts et paiements
// - Pagination optimisée
// - Gestion d'erreurs robuste

import { env } from "./env";
import { referenceApi, type ReferenceData } from "./reference-api";
import { supabase } from "./supabase-client";
import type { InterventionView } from "@/types/intervention-view";

const SUPABASE_FUNCTIONS_URL = "http://localhost:54321/functions/v1";

// Headers communs pour toutes les requêtes
const getHeaders = () => ({
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
});

// Gestionnaire d'erreurs centralisé
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  return response.json();
};

type ReferenceCache = {
  data: ReferenceData;
  fetchedAt: number;
  usersById: Map<string, ReferenceData["users"][number]>;
  agenciesById: Map<string, ReferenceData["agencies"][number]>;
  interventionStatusesById: Map<
    string,
    ReferenceData["interventionStatuses"][number]
  >;
  artisanStatusesById: Map<string, ReferenceData["artisanStatuses"][number]>;
  metiersById: Map<string, ReferenceData["metiers"][number]>;
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
  if (
    referenceCache &&
    now - referenceCache.fetchedAt < REFERENCE_CACHE_DURATION
  ) {
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
      usersById: new Map(data.users.map((user) => [user.id, user])),
      agenciesById: new Map(data.agencies.map((agency) => [agency.id, agency])),
      interventionStatusesById: new Map(
        data.interventionStatuses.map((status) => [status.id, status])
      ),
      artisanStatusesById: new Map(
        data.artisanStatuses.map((status) => [status.id, status])
      ),
      metiersById: new Map(data.metiers.map((metier) => [metier.id, metier])),
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

const buildUserDisplay = (user?: ReferenceData["users"][number] | null) => {
  if (!user) {
    return {
      username: null as string | null,
      fullName: null as string | null,
      code: null as string | null,
      color: null as string | null,
    };
  }

  const fullName = `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim();

  return {
    username: user.username ?? null,
    fullName: fullName || user.username || null,
    code: user.code_gestionnaire ?? null,
    color: user.color ?? null,
  };
};

const mapInterventionRecord = (
  item: any,
  refs: ReferenceCache
): Intervention => {
  const userInfo = buildUserDisplay(
    refs.usersById.get(item.assigned_user_id ?? "")
  );
  const agency = item.agence_id
    ? refs.agenciesById.get(item.agence_id)
    : undefined;
  const statusRelationship = item.status ?? item.intervention_statuses ?? null;
  const status =
    statusRelationship ??
    (item.statut_id
      ? refs.interventionStatusesById.get(item.statut_id)
      : undefined);
  const normalizedStatus = status
    ? {
        id: status.id,
        code: status.code,
        label: status.label,
        color: status.color,
        sort_order: status.sort_order ?? null,
      }
    : undefined;
  const statusCode = normalizedStatus?.code ?? item.statut ?? item.statusValue ?? null;
  const metier = item.metier_id
    ? refs.metiersById.get(item.metier_id)
    : undefined;

  // Extraction de l'artisan principal et de tous les artisans
  const interventionArtisans = Array.isArray(item.intervention_artisans) ? item.intervention_artisans : [];
  const primaryArtisan = interventionArtisans.find((ia: any) => ia.is_primary)?.artisans;
  const allArtisans = interventionArtisans.map((ia: any) => ia.artisans).filter(Boolean);

  // Extraction des coûts depuis intervention_costs
  const interventionCosts = Array.isArray(item.intervention_costs) ? item.intervention_costs : [];
  const coutInterventionObj = interventionCosts.find(
    (cost: any) => cost.cost_type === 'intervention' || cost.label === 'Coût Intervention'
  );
  const coutSSTObj = interventionCosts.find(
    (cost: any) => cost.cost_type === 'artisan' || cost.cost_type === 'sst' || cost.label === 'Coût SST'
  );
  const coutMaterielObj = interventionCosts.find(
    (cost: any) => cost.cost_type === 'material' || cost.label === 'Coût Matériel'
  );

  return {
    ...item,
    artisans: allArtisans,
    artisan: primaryArtisan?.plain_nom || primaryArtisan?.nom || null, // Alias pour la colonne "Artisan principal"
    primaryArtisan: primaryArtisan ? {
      id: primaryArtisan.id,
      prenom: primaryArtisan.prenom,
      nom: primaryArtisan.nom,
      plain_nom: primaryArtisan.plain_nom,
      telephone: primaryArtisan.telephone,
      email: primaryArtisan.email,
    } : null,
    costs: interventionCosts,
    payments: Array.isArray(item.payments) ? item.payments : [],
    attachments: Array.isArray(item.attachments) ? item.attachments : [],
    coutIntervention: coutInterventionObj?.amount ?? item.cout_intervention ?? item.coutIntervention ?? null,
    coutSST: coutSSTObj?.amount ?? item.cout_sst ?? item.coutSST ?? null,
    coutMateriel: coutMaterielObj?.amount ?? item.cout_materiel ?? item.coutMateriel ?? null,
    marge: item.marge ?? null,
    agence: agency?.label ?? item.agence ?? item.agence_id ?? null,
    agenceLabel: agency?.label ?? null,
    agenceCode: agency?.code ?? null,
    contexteIntervention:
      item.contexte_intervention ?? item.contexteIntervention ?? null,
    consigneIntervention:
      item.consigne_intervention ?? item.consigneIntervention ?? null,
    consigneDeuxiemeArtisanIntervention:
      item.consigne_second_artisan ??
      item.consigneDeuxiemeArtisanIntervention ??
      null,
    commentaireAgent: item.commentaire_agent ?? item.commentaireAgent ?? null,
    latitudeAdresse:
      typeof item.latitude === "number"
        ? item.latitude.toString()
        : item.latitudeAdresse ?? null,
    longitudeAdresse:
      typeof item.longitude === "number"
        ? item.longitude.toString()
        : item.longitudeAdresse ?? null,
    codePostal: item.code_postal ?? item.codePostal ?? null,
    // ⚠️ Priorité à 'date' qui est la vraie colonne DB
    dateIntervention:
      item.date ?? item.dateIntervention ?? item.date_intervention ?? null,
    prenomClient: item.prenom_client ?? item.prenomClient ?? null,
    nomClient: item.nom_client ?? item.nomClient ?? null,
    attribueA: userInfo.code ?? userInfo.username ?? undefined,
    assignedUserName: userInfo.fullName ?? undefined,
    assignedUserCode: userInfo.code,
    assignedUserColor: userInfo.color ?? null,
    status: normalizedStatus,
    statusLabel: normalizedStatus?.label ?? item.statusLabel ?? null,
    statut: statusCode,
    statusValue: statusCode,
    statusColor: normalizedStatus?.color ?? null,
    numeroSST: item.numero_sst ?? item.numeroSST ?? null,
    pourcentageSST: item.pourcentage_sst ?? item.pourcentageSST ?? null,
    commentaire: item.commentaire ?? item.commentaire_agent ?? null,
    demandeIntervention:
      item.demande_intervention ?? item.demandeIntervention ?? null,
    demandeDevis: item.demande_devis ?? item.demandeDevis ?? null,
    demandeTrustPilot:
      item.demande_trust_pilot ?? item.demandeTrustPilot ?? null,
    metier: metier?.code ?? item.metier ?? item.metier_id ?? null,
    type: item.type ?? null,
    typeDeuxiemeArtisan:
      item.type_deuxieme_artisan ?? item.typeDeuxiemeArtisan ?? null,
    datePrevue: item.date_prevue ?? item.datePrevue ?? null,
    datePrevueDeuxiemeArtisan:
      item.date_prevue_deuxieme_artisan ??
      item.datePrevueDeuxiemeArtisan ??
      null,
    telLoc: item.tel_loc ?? item.telLoc ?? null,
    locataire: item.locataire ?? null,
    emailLocataire: item.email_locataire ?? item.emailLocataire ?? null,
    telephoneClient: item.telephone_client ?? item.telephoneClient ?? null,
    telephone2Client: item.telephone2_client ?? item.telephone2Client ?? null,
    emailClient: item.email_client ?? item.emailClient ?? null,
    prenomProprietaire:
      item.prenom_proprietaire ?? item.prenomProprietaire ?? null,
    nomProprietaire: item.nom_proprietaire ?? item.nomProprietaire ?? null,
    telephoneProprietaire:
      item.telephone_proprietaire ?? item.telephoneProprietaire ?? null,
    emailProprietaire:
      item.email_proprietaire ?? item.emailProprietaire ?? null,
    pieceJointeIntervention:
      item.piece_jointe_intervention ?? item.pieceJointeIntervention ?? [],
    pieceJointeCout: item.piece_jointe_cout ?? item.pieceJointeCout ?? [],
    pieceJointeDevis: item.piece_jointe_devis ?? item.pieceJointeDevis ?? [],
    pieceJointePhotos: item.piece_jointe_photos ?? item.pieceJointePhotos ?? [],
    pieceJointeFactureGMBS:
      item.piece_jointe_facture_gmbs ?? item.pieceJointeFactureGMBS ?? [],
    pieceJointeFactureArtisan:
      item.piece_jointe_facture_artisan ?? item.pieceJointeFactureArtisan ?? [],
    pieceJointeFactureMateriel:
      item.piece_jointe_facture_materiel ??
      item.pieceJointeFactureMateriel ??
      [],
  };
};

const mapArtisanRecord = (item: any, refs: ReferenceCache): Artisan => {
  const userInfo = buildUserDisplay(
    refs.usersById.get(item.gestionnaire_id ?? "")
  );

  // Extraire les métiers depuis artisan_metiers
  const metiers = Array.isArray(item.artisan_metiers)
    ? item.artisan_metiers
        .map((am: any) => am.metiers?.code || am.metiers?.label)
        .filter(Boolean)
    : Array.isArray(item.metiers)
    ? item.metiers
    : [];

  // Extraire les zones depuis artisan_zones
  const zones = Array.isArray(item.artisan_zones)
    ? item.artisan_zones
        .map((az: any) => az.zones?.code || az.zones?.label)
        .filter(Boolean)
    : Array.isArray(item.zones)
    ? item.zones
    : [];

  return {
    // Propriétés de base de l'artisan
    id: item.id,
    prenom: item.prenom,
    nom: item.nom,
    email: item.email,
    plain_nom: item.plain_nom,
    telephone: item.telephone,
    telephone2: item.telephone2,
    departement: item.departement,
    raison_sociale: item.raison_sociale,
    siret: item.siret,
    statut_juridique: item.statut_juridique,
    adresse_siege_social: item.adresse_siege_social,
    ville_siege_social: item.ville_siege_social,
    code_postal_siege_social: item.code_postal_siege_social,
    adresse_intervention: item.adresse_intervention,
    ville_intervention: item.ville_intervention,
    code_postal_intervention: item.code_postal_intervention,
    intervention_latitude: item.intervention_latitude,
    intervention_longitude: item.intervention_longitude,
    numero_associe: item.numero_associe,
    gestionnaire_id: item.gestionnaire_id,
    statut_id: item.statut_id,
    suivi_relances_docs: item.suivi_relances_docs,
    date_ajout: item.date_ajout,
    is_active: item.is_active,
    created_at: item.created_at,
    updated_at: item.updated_at,
    
    // Propriétés calculées et relations
    metiers,
    zones,
    attribueA: userInfo.code ?? userInfo.username ?? undefined,
    gestionnaireUsername: userInfo.username ?? undefined,
    gestionnaireName: userInfo.fullName ?? undefined,
    statutArtisan: item.statut_id ?? item.statutArtisan ?? null,
    statutInactif: item.is_active === false,
    commentaire: item.suivi_relances_docs ?? item.commentaire ?? null,
    statutDossier: item.statut_dossier ?? item.statutDossier ?? null,
    zoneIntervention:
      zones.length > 0
        ? Number(zones[0]) || zones[0]
        : item.zoneIntervention ?? null,
    date: item.date_ajout ?? item.date ?? null,
  };
};

// ===== TYPES ET INTERFACES =====

export interface User {
  id: string;
  firstname: string | null;
  lastname: string | null;
  username: string;
  email: string | null;
  roles: string[];
  token_version: number | null;
  color: string | null;
  code_gestionnaire: string | null;
  status: "connected" | "dnd" | "busy" | "offline";
  last_seen_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Artisan {
  id: string;
  prenom: string | null;
  nom: string | null;
  telephone: string | null;
  telephone2: string | null;
  email: string | null;
  raison_sociale: string | null;
  siret: string | null;
  statut_juridique: string | null;
  statut_id: string | null;
  gestionnaire_id: string | null;
  adresse_siege_social: string | null;
  ville_siege_social: string | null;
  code_postal_siege_social: string | null;
  departement: string | null;
  adresse_intervention: string | null;
  ville_intervention: string | null;
  code_postal_intervention: string | null;
  intervention_latitude: number | null;
  intervention_longitude: number | null;
  numero_associe: string | null;
  suivi_relances_docs: string | null;
  is_active: boolean | null;
  date_ajout: string | null;
  created_at: string | null;
  updated_at: string | null;
  metiers?: string[];
  zones?: string[];
}

export interface Intervention {
  id: string;
  id_inter: string | null;
  agence_id: string | null;
  client_id: string | null;
  assigned_user_id: string | null;
  statut_id: string | null;
  metier_id: string | null;
  date: string;
  date_termine: string | null;
  date_prevue: string | null;
  due_date: string | null;
  contexte_intervention: string | null;
  consigne_intervention: string | null;
  consigne_second_artisan: string | null;
  commentaire_agent: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  latitude: number | null;
  longitude: number | null;
  numero_sst: string | null;
  pourcentage_sst: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  artisans?: string[];
  costs?: InterventionCost[];
  payments?: InterventionPayment[];
  attachments?: InterventionAttachment[];
}

export interface InterventionCost {
  id: string;
  intervention_id: string;
  cost_type: "sst" | "materiel" | "intervention" | "total";
  label: string | null;
  amount: number;
  currency: string | null;
  metadata: any;
  created_at: string | null;
  updated_at: string | null;
}

export interface InterventionPayment {
  id: string;
  intervention_id: string;
  payment_type: string;
  amount: number;
  currency: string | null;
  is_received: boolean | null;
  payment_date: string | null;
  reference: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface InterventionAttachment {
  id: string;
  intervention_id: string;
  kind: string;
  url: string;
  filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  created_at: string | null;
}

export interface ArtisanAttachment {
  id: string;
  artisan_id: string;
  kind: string;
  url: string;
  filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  created_at: string | null;
  created_by: string | null;
  created_by_display: string | null;
  created_by_code: string | null;
  created_by_color: string | null;
}

export interface Comment {
  id: string;
  entity_id: string;
  entity_type: "intervention" | "artisan" | "client";
  content: string;
  comment_type: string;
  is_internal: boolean | null;
  author_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  users?: {
    id: string;
    firstname: string | null;
    lastname: string | null;
    username: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

// ===== API INTERVENTIONS V2 =====

/**
 * Mapping des propriétés de la vue vers les vraies colonnes de la base
 * ⚠️ Basé sur le schéma réel : supabase/migrations/20251005_clean_schema.sql
 */
const PROPERTY_COLUMN_MAP: Record<string, string> = {
  // Identifiants
  id: "id",
  id_inter: "id_inter",
  
  // Statut
  statusValue: "statut_id",
  statut: "statut_id",
  statut_id: "statut_id",
  
  // User assigné
  attribueA: "assigned_user_id",
  assigned_user_id: "assigned_user_id",
  assignedUserName: "assigned_user_id",
  
  // Agence
  agence: "agence_id",
  agence_id: "agence_id",
  agenceLabel: "agence_id",
  
  // Métier
  metier: "metier_id",
  metier_id: "metier_id",
  
  // Dates - ⚠️ La colonne principale est 'date', pas 'date_intervention'
  date: "date",
  dateIntervention: "date",      // Propriété vue → colonne 'date'
  date_intervention: "date",     // Alias → colonne 'date'
  dateTermine: "date_termine",
  date_termine: "date_termine",
  datePrevue: "date_prevue",
  date_prevue: "date_prevue",
  dueDate: "due_date",
  due_date: "due_date",
  created_at: "created_at",
  updated_at: "updated_at",
  
  // Localisation
  codePostal: "code_postal",
  code_postal: "code_postal",
  ville: "ville",
  adresse: "adresse",
  
  // Tenant / Owner
  tenantId: "tenant_id",
  tenant_id: "tenant_id",
  clientId: "tenant_id",          // Ancien nom → nouveau nom
  ownerId: "owner_id",
  owner_id: "owner_id",
  
  // État
  isActive: "is_active",
  is_active: "is_active",
};

/**
 * Colonnes par défaut pour les interventions
 * ⚠️ Basé sur le schéma réel : supabase/migrations/20251005_clean_schema.sql
 * ⚠️ Les colonnes artisan, coûts sont dans des tables séparées (intervention_artisans, intervention_costs)
 */
const DEFAULT_INTERVENTION_COLUMNS: string[] = [
  "id",
  "id_inter",
  "created_at",
  "updated_at",
  "statut_id",
  "assigned_user_id",
  "agence_id",
  "tenant_id",
  "owner_id",
  "metier_id",
  "date",              // ⚠️ Colonne principale pour la date (PAS date_intervention)
  "date_termine",
  "date_prevue",
  "due_date",
  "contexte_intervention",
  "consigne_intervention",
  "consigne_second_artisan",
  "commentaire_agent",
  "adresse",
  "code_postal",
  "ville",
  "latitude",
  "longitude",
  "is_active",
];

const SUPPORTED_SORT_COLUMNS = new Set(
  Object.values(PROPERTY_COLUMN_MAP).concat([
    "created_at",
    "date",         // ⚠️ Colonne principale pour la date
    "date_termine",
    "date_prevue",
    "due_date",
  ]),
);

const resolveColumn = (property: string): string => {
  return PROPERTY_COLUMN_MAP[property] ?? property;
};

const resolveSelectColumns = (fields?: string[]): string => {
  const columns = new Set<string>(DEFAULT_INTERVENTION_COLUMNS);
  if (Array.isArray(fields)) {
    fields.forEach((field) => {
      if (!field) return;
      const column = resolveColumn(field);
      column && columns.add(column);
    });
  }
  const selection = Array.from(columns).filter(Boolean);
  if (!selection.length) {
    return "*";
  }
  return selection.join(",");
};

const normalizeSort = (sortBy?: string, sortDir?: "asc" | "desc") => {
  if (!sortBy) {
    return { column: "created_at", ascending: false };
  }
  const column = resolveColumn(sortBy);
  if (!SUPPORTED_SORT_COLUMNS.has(column)) {
    return { column: "created_at", ascending: false };
  }
  return { column, ascending: sortDir === "asc" };
};

type FilterValue = string | string[] | undefined;

export type GetAllParams = {
  limit?: number;
  offset?: number;
  statut?: FilterValue;
  agence?: FilterValue;
  artisan?: FilterValue;
  metier?: FilterValue;
  user?: FilterValue;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  fields?: string[];
};

export type GetDistinctParams = Omit<GetAllParams, "offset" | "limit" | "fields" | "sortBy" | "sortDir"> & {
  limit?: number;
};

const applyInterventionFilters = <T>(query: T, params?: GetAllParams): T => {
  if (!params) {
    return query;
  }

  type Builder = {
    in: (column: string, values: string[]) => Builder;
    eq: (column: string, value: string | null) => Builder;
    gte: (column: string, value: string) => Builder;
    lte: (column: string, value: string) => Builder;
    ilike: (column: string, pattern: string) => Builder;
    is: (column: string, value: null) => Builder;
  };

  let builder = query as unknown as Builder;

  if (params.statut) {
    if (Array.isArray(params.statut) && params.statut.length > 0) {
      builder = builder.in("statut_id", params.statut);
    } else if (typeof params.statut === "string") {
      builder = builder.eq("statut_id", params.statut);
    }
  }

  if (params.agence) {
    if (Array.isArray(params.agence) && params.agence.length > 0) {
      builder = builder.in("agence_id", params.agence);
    } else if (typeof params.agence === "string") {
      builder = builder.eq("agence_id", params.agence);
    }
  }

  if (params.metier) {
    if (Array.isArray(params.metier) && params.metier.length > 0) {
      builder = builder.in("metier_id", params.metier);
    } else if (typeof params.metier === "string") {
      builder = builder.eq("metier_id", params.metier);
    }
  }

  // ⚠️ TODO: Le filtre artisan nécessite un JOIN avec intervention_artisans
  // Pour l'instant, il est ignoré car artisan n'est pas une colonne directe

  const userFilter = (params as { user?: string | string[] | null })?.user;
  if (Array.isArray(userFilter) && userFilter.length > 0) {
    builder = builder.in("assigned_user_id", userFilter);
  } else if (typeof userFilter === "string") {
    builder = builder.eq("assigned_user_id", userFilter);
  } else if (userFilter === null) {
    builder = builder.is("assigned_user_id", null);
  }

  if (params.startDate) {
    builder = builder.gte("date", params.startDate);
  }
  if (params.endDate) {
    builder = builder.lte("date", params.endDate);
  }

  if (params.search) {
    builder = builder.ilike("contexte_intervention", `%${params.search}%`);
  }

  return builder as unknown as T;
};

export const interventionsApiV2 = {
  // Récupérer toutes les interventions (ULTRA-OPTIMISÉ)
  async getAll(params?: GetAllParams): Promise<PaginatedResponse<InterventionView>> {
    const limit = Math.max(1, Math.min(params?.limit ?? 50, 200));
    const offset = Math.max(0, params?.offset ?? 0);
    const selectColumns = resolveSelectColumns(params?.fields);
    const { column: sortColumn, ascending } = normalizeSort(params?.sortBy, params?.sortDir);

    // Construction de la requête avec les relations
    const baseSelect = selectColumns === "*" ? "*" : selectColumns;
    const fullSelect = `${baseSelect},
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
      )`;

    let query = supabase
      .from("interventions")
      .select(fullSelect, { count: "exact" })
      .order(sortColumn, { ascending });

    query = applyInterventionFilters(query, params);

    const { data, error, count, status } = await query.range(offset, offset + limit - 1);

    if (status === 416) {
      // La plage demandée dépasse le nombre de résultats disponibles (ex: offset trop grand)
      const countQuery = applyInterventionFilters(
        supabase.from("interventions").select("*", { count: "exact", head: true }),
        params,
      );
      const { count: fallbackCount, error: countError } = await countQuery;

      if (countError) {
        throw countError;
      }

      return {
        data: [],
        pagination: {
          total: fallbackCount ?? 0,
          limit,
          offset,
          hasMore: false,
        },
      };
    }

    if (error) throw error;

    const refs = await getReferenceCache();

    const transformedData = (data || []).map((item) =>
      mapInterventionRecord(item, refs)
    ) as InterventionView[];

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
   * @returns Le nombre total d'interventions ou 0 en cas d'erreur
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
  async getById(id: string, include?: string[]): Promise<InterventionView> {
    const searchParams = new URLSearchParams();
    if (include) searchParams.append("include", include.join(","));

    const url = `${SUPABASE_FUNCTIONS_URL}/interventions-v2/interventions/${id}${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;

    const response = await fetch(url, {
      headers: getHeaders(),
    });
    const raw = await handleResponse(response);
    const refs = await getReferenceCache();
    const record = raw?.data ?? raw;
    return mapInterventionRecord(record, refs) as InterventionView;
  },

  // Créer une intervention
  async create(data: {
    agence_id?: string;
    client_id?: string;
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
  }): Promise<Intervention> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/interventions-v2/interventions`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );
    return await handleResponse(response);
  },

  // Modifier une intervention
  async update(
    id: string,
    data: {
      agence_id?: string;
      client_id?: string;
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
  ): Promise<Intervention> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/interventions-v2/interventions/${id}`,
      {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );
    const raw = await handleResponse(response);
    const refs = await getReferenceCache();
    const record = raw?.data ?? raw;
    return mapInterventionRecord(record, refs);
  },

  // Supprimer une intervention (soft delete)
  async delete(id: string): Promise<{ message: string; data: Intervention }> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/interventions-v2/interventions/${id}`,
      {
        method: "DELETE",
        headers: getHeaders(),
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
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/interventions-v2/interventions/${interventionId}/artisans`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          artisan_id: artisanId,
          role,
          is_primary: role === "primary",
        }),
      }
    );
    return handleResponse(response);
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
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/interventions-v2/interventions/${interventionId}/costs`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
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
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/interventions-v2/interventions/${interventionId}/payments`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  // Upsert une intervention (créer ou mettre à jour)
  async upsert(data: {
    id_inter?: string;
    agence_id?: string;
    client_id?: string;
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
  }): Promise<Intervention> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/interventions-v2/interventions/upsert`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
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
  ): Promise<any> {
    const results = { success: 0, errors: 0, details: [] as any[] };

    for (const cost of costs) {
      try {
        const result = await this.addCost(cost.intervention_id, cost);
        results.success++;
        results.details.push({ cost, success: true, data: result });
      } catch (error: any) {
        results.errors++;
        results.details.push({ cost, success: false, error: error.message });
      }
    }

    return results;
  },
};

// ===== API ARTISANS V2 =====

export const artisansApiV2 = {
  // Récupérer tous les artisans (ULTRA-OPTIMISÉ)
  async getAll(params?: {
    limit?: number;
    offset?: number;
    statut?: string;
    metier?: string;
    zone?: string;
    gestionnaire?: string;
  }): Promise<PaginatedResponse<Artisan>> {
    // Version ultra-rapide avec jointures pour métiers et zones
    let query = supabase
      .from("artisans")
      .select(`
        *,
        artisan_metiers (
          metier_id,
          metiers (
            id,
            code,
            label
          )
        ),
        artisan_zones (
          zone_id,
          zones (
            id,
            code,
            label
          )
        )
      `, { count: "exact" })
      // ⚠️ Ordre ASC pour afficher d'abord les artisans avec des données
      // Les artisans récents ont été importés avec des colonnes NULL
      .order("created_at", { ascending: true });

    // Appliquer les filtres si nécessaire
    if (params?.statut) {
      query = query.eq("statut_id", params.statut);
    }
    if (params?.gestionnaire) {
      query = query.eq("gestionnaire_id", params.gestionnaire);
    }

    // Pagination
    const limit = params?.limit || 500;
    const offset = params?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const refs = await getReferenceCache();

    const transformedData = (data || []).map((item) =>
      mapArtisanRecord(item, refs)
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

  // Récupérer un artisan par ID
  async getById(id: string, include?: string[]): Promise<Artisan> {
    const searchParams = new URLSearchParams();
    if (include) searchParams.append("include", include.join(","));

    const url = `${SUPABASE_FUNCTIONS_URL}/artisans-v2/artisans/${id}${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;

    const response = await fetch(url, {
      headers: getHeaders(),
    });
    const raw = await handleResponse(response);
    const refs = await getReferenceCache();
    const record = raw?.data ?? raw;
    return mapArtisanRecord(record, refs);
  },

  // Créer un artisan
  async create(data: {
    prenom?: string;
    nom?: string;
    telephone?: string;
    telephone2?: string;
    email?: string;
    raison_sociale?: string;
    siret?: string;
    statut_juridique?: string;
    statut_id?: string;
    gestionnaire_id?: string;
    adresse_siege_social?: string;
    ville_siege_social?: string;
    code_postal_siege_social?: string;
    adresse_intervention?: string;
    ville_intervention?: string;
    code_postal_intervention?: string;
    intervention_latitude?: number;
    intervention_longitude?: number;
    numero_associe?: string;
    suivi_relances_docs?: string;
    metiers?: string[];
    zones?: string[];
  }): Promise<Artisan> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/artisans-v2/artisans`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );
    const raw = await handleResponse(response);
    const refs = await getReferenceCache();
    const record = raw?.data ?? raw;
    return mapArtisanRecord(record, refs);
  },

  // Upsert un artisan (créer ou mettre à jour)
  async upsert(data: {
    prenom?: string;
    nom?: string;
    telephone?: string;
    telephone2?: string;
    email?: string;
    raison_sociale?: string;
    siret?: string;
    statut_juridique?: string;
    statut_id?: string;
    gestionnaire_id?: string;
    adresse_siege_social?: string;
    ville_siege_social?: string;
    code_postal_siege_social?: string;
    adresse_intervention?: string;
    ville_intervention?: string;
    code_postal_intervention?: string;
    intervention_latitude?: number;
    intervention_longitude?: number;
    numero_associe?: string;
    suivi_relances_docs?: string;
    metiers?: string[];
    zones?: string[];
  }): Promise<Artisan> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/artisans-v2/artisans/upsert`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  // Créer un document pour un artisan
  async createDocument(data: {
    artisan_id: string;
    kind: string;
    url: string;
    filename: string;
    created_at?: string;
    updated_at?: string;
  }): Promise<any> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/artisans-v2/artisans/${data.artisan_id}/documents`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  // Créer une association métier-artisan
  async createArtisanMetier(data: {
    artisan_id: string;
    metier_id: string;
    is_primary?: boolean;
  }): Promise<any> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/artisans-v2/artisans/${data.artisan_id}/metiers`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  // Créer une association zone-artisan
  async createArtisanZone(data: {
    artisan_id: string;
    zone_id: string;
  }): Promise<any> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/artisans-v2/artisans/${data.artisan_id}/zones`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  // Modifier un artisan
  async update(
    id: string,
    data: {
      prenom?: string;
      nom?: string;
      telephone?: string;
      telephone2?: string;
      email?: string;
      raison_sociale?: string;
      siret?: string;
      statut_juridique?: string;
      statut_id?: string;
      gestionnaire_id?: string;
      adresse_siege_social?: string;
      ville_siege_social?: string;
      code_postal_siege_social?: string;
      adresse_intervention?: string;
      ville_intervention?: string;
      code_postal_intervention?: string;
      intervention_latitude?: number;
      intervention_longitude?: number;
      numero_associe?: string;
      suivi_relances_docs?: string;
      is_active?: boolean;
      metiers?: string[];
      zones?: string[];
    }
  ): Promise<Artisan> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/artisans-v2/artisans/${id}`,
      {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );
    const raw = await handleResponse(response);
    const refs = await getReferenceCache();
    const record = raw?.data ?? raw;
    return mapArtisanRecord(record, refs);
  },

  // Supprimer un artisan (soft delete)
  async delete(id: string): Promise<{ message: string; data: Artisan }> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/artisans-v2/artisans/${id}`,
      {
        method: "DELETE",
        headers: getHeaders(),
      }
    );
    return handleResponse(response);
  },

  // Assigner un métier à un artisan
  async assignMetier(
    artisanId: string,
    metierId: string,
    isPrimary: boolean = false
  ): Promise<any> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/artisans-v2/artisans/${artisanId}/metiers`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          metier_id: metierId,
          is_primary: isPrimary,
        }),
      }
    );
    return handleResponse(response);
  },

  // Assigner une zone à un artisan
  async assignZone(artisanId: string, zoneId: string): Promise<any> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/artisans-v2/artisans/${artisanId}/zones`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          zone_id: zoneId,
        }),
      }
    );
    return handleResponse(response);
  },

  // Insérer plusieurs métiers pour un artisan
  async insertArtisanMetiers(
    metiers: Array<{
      artisan_id: string;
      metier_id: string;
      is_primary?: boolean;
    }>
  ): Promise<any> {
    const results = { success: 0, errors: 0, details: [] as any[] };

    for (const metier of metiers) {
      try {
        const result = await this.createArtisanMetier(metier);
        results.success++;
        results.details.push({ metier, success: true, data: result });
      } catch (error: any) {
        results.errors++;
        results.details.push({ metier, success: false, error: error.message });
      }
    }

    return results;
  },

  // Insérer plusieurs zones pour un artisan
  async insertArtisanZones(
    zones: Array<{
      artisan_id: string;
      zone_id: string;
    }>
  ): Promise<any> {
    const results = { success: 0, errors: 0, details: [] as any[] };

    for (const zone of zones) {
      try {
        const result = await this.createArtisanZone(zone);
        results.success++;
        results.details.push({ zone, success: true, data: result });
      } catch (error: any) {
        results.errors++;
        results.details.push({ zone, success: false, error: error.message });
      }
    }

    return results;
  },
};

// ===== API CLIENTS =====

export const clientsApi = {
  // Récupérer tous les clients
  async getAll(params?: {
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<any>> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());

    const url = `${SUPABASE_FUNCTIONS_URL}/clients/clients${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;

    const response = await fetch(url, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Récupérer un client par ID
  async getById(id: string): Promise<any> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/clients/clients/${id}`,
      {
        headers: getHeaders(),
      }
    );
    return handleResponse(response);
  },

  // Créer un client
  async create(data: {
    firstname?: string;
    lastname?: string;
    email?: string;
    telephone?: string;
    adresse?: string;
    ville?: string;
    code_postal?: string;
  }): Promise<any> {
    const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/clients/clients`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Insérer plusieurs clients
  async insertClients(
    clients: Array<{
      firstname?: string;
      lastname?: string;
      email?: string;
      telephone?: string;
      adresse?: string;
      ville?: string;
      code_postal?: string;
    }>
  ): Promise<any> {
    const results = { success: 0, errors: 0, details: [] as any[] };

    for (const client of clients) {
      try {
        const result = await this.create(client);
        results.success++;
        results.details.push({ client, success: true, data: result });
      } catch (error: any) {
        results.errors++;
        results.details.push({ client, success: false, error: error.message });
      }
    }

    return results;
  },

  // Modifier un client
  async update(
    id: string,
    data: {
      firstname?: string;
      lastname?: string;
      email?: string;
      telephone?: string;
      adresse?: string;
      ville?: string;
      code_postal?: string;
    }
  ): Promise<any> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/clients/clients/${id}`,
      {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  // Supprimer un client
  async delete(id: string): Promise<{ message: string; data: any }> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/clients/clients/${id}`,
      {
        method: "DELETE",
        headers: getHeaders(),
      }
    );
    return handleResponse(response);
  },
};

// ===== API DOCUMENTS =====

export const documentsApi = {
  // Récupérer tous les documents
  async getAll(params?: {
    entity_type?: "intervention" | "artisan";
    entity_id?: string;
    kind?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<InterventionAttachment | ArtisanAttachment>> {
    const searchParams = new URLSearchParams();

    if (params?.entity_type)
      searchParams.append("entity_type", params.entity_type);
    if (params?.entity_id) searchParams.append("entity_id", params.entity_id);
    if (params?.kind) searchParams.append("kind", params.kind);
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());

    const url = `${SUPABASE_FUNCTIONS_URL}/documents/documents${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;

    const response = await fetch(url, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Récupérer un document par ID
  async getById(
    id: string,
    entityType: "intervention" | "artisan" = "intervention"
  ): Promise<InterventionAttachment | ArtisanAttachment> {
    const url = `${SUPABASE_FUNCTIONS_URL}/documents/documents/${id}?entity_type=${entityType}`;

    const response = await fetch(url, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Créer un document
  async create(data: {
    entity_id: string;
    entity_type: "intervention" | "artisan";
    kind: string;
    url: string;
    filename?: string;
    mime_type?: string;
    file_size?: number;
    created_by?: string;
    created_by_display?: string;
    created_by_code?: string;
    created_by_color?: string;
  }): Promise<InterventionAttachment | ArtisanAttachment> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/documents/documents`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  // Upload un document avec contenu
  async upload(data: {
    entity_id: string;
    entity_type: "intervention" | "artisan";
    kind: string;
    filename: string;
    mime_type: string;
    file_size: number;
    content: string; // Base64 encoded
    created_by?: string;
    created_by_display?: string;
    created_by_code?: string;
    created_by_color?: string;
  }): Promise<InterventionAttachment | ArtisanAttachment> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/documents/documents/upload`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  // Modifier un document
  async update(
    id: string,
    data: {
      kind?: string;
      filename?: string;
      mime_type?: string;
      file_size?: number;
      created_by?: string | null;
      created_by_display?: string | null;
      created_by_code?: string | null;
      created_by_color?: string | null;
    },
    entityType: "intervention" | "artisan" = "intervention"
  ): Promise<InterventionAttachment | ArtisanAttachment> {
    const url = `${SUPABASE_FUNCTIONS_URL}/documents/documents/${id}?entity_type=${entityType}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Supprimer un document
  async delete(
    id: string,
    entityType: "intervention" | "artisan" = "intervention"
  ): Promise<{ message: string; data: any }> {
    const url = `${SUPABASE_FUNCTIONS_URL}/documents/documents/${id}?entity_type=${entityType}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Obtenir les types de documents supportés
  async getSupportedTypes(): Promise<{
    supported_types: Record<string, string[]>;
    max_file_size: string;
    allowed_mime_types: string[];
  }> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/documents/documents/types`,
      {
        headers: getHeaders(),
      }
    );
    return handleResponse(response);
  },
};

// ===== API COMMENTAIRES =====

export const commentsApi = {
  // Récupérer tous les commentaires
  async getAll(params?: {
    entity_type?: "intervention" | "artisan" | "client";
    entity_id?: string;
    comment_type?: string;
    is_internal?: boolean;
    author_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<Comment>> {
    const searchParams = new URLSearchParams();

    if (params?.entity_type)
      searchParams.append("entity_type", params.entity_type);
    if (params?.entity_id) searchParams.append("entity_id", params.entity_id);
    if (params?.comment_type)
      searchParams.append("comment_type", params.comment_type);
    if (params?.is_internal !== undefined)
      searchParams.append("is_internal", params.is_internal.toString());
    if (params?.author_id) searchParams.append("author_id", params.author_id);
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());

    const url = `${SUPABASE_FUNCTIONS_URL}/comments/comments${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;

    const response = await fetch(url, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Récupérer un commentaire par ID
  async getById(id: string): Promise<Comment> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/comments/comments/${id}`,
      {
        headers: getHeaders(),
      }
    );
    return handleResponse(response);
  },

  // Créer un commentaire
  async create(data: {
    entity_id: string;
    entity_type: "intervention" | "artisan" | "client";
    content: string;
    comment_type?: string;
    is_internal?: boolean;
    author_id?: string;
  }): Promise<Comment> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/comments/comments`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  // Modifier un commentaire
  async update(
    id: string,
    data: {
      content?: string;
      comment_type?: string;
      is_internal?: boolean;
    }
  ): Promise<Comment> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/comments/comments/${id}`,
      {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  // Supprimer un commentaire
  async delete(id: string): Promise<{ message: string; data: Comment }> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/comments/comments/${id}`,
      {
        method: "DELETE",
        headers: getHeaders(),
      }
    );
    return handleResponse(response);
  },

  // Obtenir les types de commentaires supportés
  async getSupportedTypes(): Promise<{
    comment_types: string[];
    entity_types: string[];
    default_type: string;
    internal_default: boolean;
  }> {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/comments/comments/types`,
      {
        headers: getHeaders(),
      }
    );
    return handleResponse(response);
  },

  // Obtenir les statistiques des commentaires
  async getStats(params?: {
    entity_type?: "intervention" | "artisan" | "client";
    entity_id?: string;
  }): Promise<{
    total: number;
    by_type: Record<string, number>;
    by_internal: { internal: number; external: number };
    recent_count: number;
  }> {
    const searchParams = new URLSearchParams();

    if (params?.entity_type)
      searchParams.append("entity_type", params.entity_type);
    if (params?.entity_id) searchParams.append("entity_id", params.entity_id);

    const url = `${SUPABASE_FUNCTIONS_URL}/comments/comments/stats${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;

    const response = await fetch(url, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

// ===== API ÉNUMÉRATIONS =====

export const enumsApi = {
  // ===== MÉTIERS =====

  // Récupérer tous les métiers
  async getMetiers(): Promise<any[]> {
    const { data, error } = await supabase
      .from("metiers")
      .select("*")
      .eq("is_active", true)
      .order("label");

    if (error) throw error;
    return data || [];
  },

  // Créer un métier
  async createMetier(data: {
    code?: string;
    label: string;
    description?: string;
  }): Promise<any> {
    const { data: result, error } = await supabase
      .from("metiers")
      .insert({
        code: data.code || data.label.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        label: data.label,
        description:
          data.description || `Métier créé automatiquement lors de l'import`,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) throw error;
    return result;
  },

  // Trouver ou créer un métier
  async findOrCreateMetier(label: string): Promise<string> {
    // Essayer de trouver le métier existant
    const { data: existing } = await supabase
      .from("metiers")
      .select("id")
      .eq("label", label)
      .single();

    if (existing) {
      return existing.id;
    }

    // Créer le métier s'il n'existe pas
    const { data: newMetier, error } = await supabase
      .from("metiers")
      .insert({
        code: label.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        label: label,
        description: `Métier créé automatiquement lors de l'import`,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) throw error;
    return newMetier.id;
  },

  // ===== STATUTS ARTISANS =====

  // Récupérer tous les statuts artisans
  async getArtisanStatuses(): Promise<any[]> {
    const { data, error } = await supabase
      .from("artisan_statuses")
      .select("*")
      .eq("is_active", true)
      .order("label");

    if (error) throw error;
    return data || [];
  },

  // Créer un statut artisan
  async createArtisanStatus(data: {
    code: string;
    label: string;
    color?: string;
  }): Promise<any> {
    const { data: result, error } = await supabase
      .from("artisan_statuses")
      .insert({
        code: data.code,
        label: data.label,
        color: data.color,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) throw error;
    return result;
  },

  // Trouver ou créer un statut artisan
  async findOrCreateArtisanStatus(code: string): Promise<string> {
    // Essayer de trouver le statut existant
    const { data: existing } = await supabase
      .from("artisan_statuses")
      .select("id")
      .eq("code", code)
      .single();

    if (existing) {
      return existing.id;
    }

    // Créer le statut s'il n'existe pas
    const { data: newStatus, error } = await supabase
      .from("artisan_statuses")
      .insert({
        code: code,
        label: code,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) throw error;
    return newStatus.id;
  },

  // ===== STATUTS INTERVENTIONS =====

  // Récupérer tous les statuts interventions
  async getInterventionStatuses(): Promise<any[]> {
    const { data, error } = await supabase
      .from("intervention_statuses")
      .select("*")
      .eq("is_active", true)
      .order("label");

    if (error) throw error;
    return data || [];
  },

  // Créer un statut intervention
  async createInterventionStatus(data: {
    code: string;
    label: string;
    color?: string;
  }): Promise<any> {
    const { data: result, error } = await supabase
      .from("intervention_statuses")
      .insert({
        code: data.code,
        label: data.label,
        color: data.color,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) throw error;
    return result;
  },

  // Trouver ou créer un statut intervention
  async findOrCreateInterventionStatus(code: string): Promise<string> {
    // Essayer de trouver le statut existant
    const { data: existing } = await supabase
      .from("intervention_statuses")
      .select("id")
      .eq("code", code)
      .single();

    if (existing) {
      return existing.id;
    }

    // Créer le statut s'il n'existe pas
    const { data: newStatus, error } = await supabase
      .from("intervention_statuses")
      .insert({
        code: code,
        label: code,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) throw error;
    return newStatus.id;
  },

  // ===== AGENCES =====

  // Récupérer toutes les agences
  async getAgencies(): Promise<any[]> {
    const { data, error } = await supabase
      .from("agencies")
      .select("*")
      .eq("is_active", true)
      .order("label");

    if (error) throw error;
    return data || [];
  },

  // Créer une agence
  async createAgency(data: {
    label: string;
    code?: string;
    region?: string;
  }): Promise<any> {
    const { data: result, error } = await supabase
      .from("agencies")
      .insert({
        code: data.code || data.label.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        label: data.label,
        region: data.region,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) throw error;
    return result;
  },

  // Trouver ou créer une agence
  async findOrCreateAgency(label: string): Promise<string> {
    // Essayer de trouver l'agence existante
    const { data: existing } = await supabase
      .from("agencies")
      .select("id")
      .eq("label", label)
      .single();

    if (existing) {
      return existing.id;
    }

    // Créer l'agence si elle n'existe pas
    const { data: newAgency, error } = await supabase
      .from("agencies")
      .insert({
        code: label.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        label: label,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) throw error;
    return newAgency.id;
  },

  // ===== UTILISATEURS =====

  // Récupérer tous les utilisateurs
  async getUsers(): Promise<any[]> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("username");

    if (error) throw error;
    return data || [];
  },

  // Créer un utilisateur
  async createUser(data: {
    username: string;
    firstname?: string;
    lastname?: string;
    email?: string;
    roles?: string[];
  }): Promise<any> {
    const { data: result, error } = await supabase
      .from("users")
      .insert({
        username: data.username,
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email,
        roles: data.roles || ["user"],
        status: "offline",
      })
      .select("id")
      .single();

    if (error) throw error;
    return result;
  },

  // Trouver ou créer un utilisateur
  async findOrCreateUser(name: string): Promise<string> {
    // Essayer de trouver l'utilisateur existant
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .or(
        `firstname.ilike.%${name}%,lastname.ilike.%${name}%,username.ilike.%${name}%`
      )
      .single();

    if (existing) {
      return existing.id;
    }

    // Créer l'utilisateur s'il n'existe pas
    const username = name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        username: username,
        firstname: name.split(" ")[0],
        lastname: name.split(" ").slice(1).join(" "),
        roles: ["user"],
        status: "offline",
      })
      .select("id")
      .single();

    if (error) throw error;
    return newUser.id;
  },

  // ===== ZONES =====

  // Récupérer toutes les zones
  async getZones(): Promise<any[]> {
    const { data, error } = await supabase
      .from("zones")
      .select("*")
      .eq("is_active", true)
      .order("label");

    if (error) throw error;
    return data || [];
  },

  // Créer une zone
  async createZone(data: {
    code?: string;
    label: string;
    region?: string;
  }): Promise<any> {
    const { data: result, error } = await supabase
      .from("zones")
      .insert({
        code: data.code || data.label.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        label: data.label,
        region: data.region,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) throw error;
    return result;
  },

  // Trouver ou créer une zone
  async findOrCreateZone(label: string): Promise<string> {
    // Essayer de trouver la zone existante
    const { data: existing } = await supabase
      .from("zones")
      .select("id")
      .eq("label", label)
      .single();

    if (existing) {
      return existing.id;
    }

    // Créer la zone si elle n'existe pas
    const { data: newZone, error } = await supabase
      .from("zones")
      .insert({
        code: label.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        label: label,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) throw error;
    return newZone.id;
  },
};

// ===== API USERS V2 =====

export const usersApiV2 = {
  // Récupérer tous les utilisateurs avec leurs rôles
  async getAll(params?: {
    limit?: number;
    offset?: number;
    status?: string;
    role?: string;
  }): Promise<PaginatedResponse<User>> {
    let query = supabase
      .from("users")
      .select(`
        *,
        user_roles!inner(
          role_id,
          roles!inner(
            id,
            name,
            description
          )
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false });

    // Appliquer les filtres si nécessaire
    if (params?.status) {
      query = query.eq("status", params.status);
    }

    // Pagination
    const limit = params?.limit || 500;
    const offset = params?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const transformedData = (data || []).map((item) => ({
      ...item,
      roles: item.user_roles?.map((ur: any) => ur.roles?.name).filter(Boolean) || [],
    }));

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

  // Récupérer un utilisateur par ID
  async getById(id: string): Promise<User> {
    const { data, error } = await supabase
      .from("users")
      .select(`
        *,
        user_roles!inner(
          role_id,
          roles!inner(
            id,
            name,
            description
          )
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    return {
      ...data,
      roles: data.user_roles?.map((ur: any) => ur.roles?.name).filter(Boolean) || [],
    };
  },

  // Créer un utilisateur complet (auth + profile)
  async create(data: {
    email: string;
    password: string;
    username: string;
    firstname?: string;
    lastname?: string;
    color?: string;
    code_gestionnaire?: string;
    roles?: string[];
  }): Promise<User> {
    // 1. Créer l'utilisateur dans Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        name: data.firstname,
        prenom: data.lastname,
      },
    });

    if (authError) throw authError;
    if (!authUser.user) throw new Error("Failed to create auth user");

    const userId = authUser.user.id;

    // 2. Créer le profil dans public.users avec le même ID
    const { data: profileData, error: profileError } = await supabase
      .from("users")
      .insert({
        id: userId, // Même ID que auth.users
        username: data.username,
        email: data.email,
        firstname: data.firstname,
        lastname: data.lastname,
        color: data.color,
        code_gestionnaire: data.code_gestionnaire,
        status: "offline",
        token_version: 0,
      })
      .select()
      .single();

    if (profileError) {
      // Si le profil échoue, supprimer l'utilisateur auth
      await supabase.auth.admin.deleteUser(userId);
      throw profileError;
    }

    // 3. Assigner les rôles si spécifiés
    if (data.roles && data.roles.length > 0) {
      await this.assignRoles(userId, data.roles);
    }

    // 4. Récupérer l'utilisateur complet avec ses rôles
    return await this.getById(userId);
  },

  // Modifier un utilisateur
  async update(
    id: string,
    data: {
      email?: string;
      password?: string;
      username?: string;
      firstname?: string;
      lastname?: string;
      color?: string;
      code_gestionnaire?: string;
      status?: "connected" | "dnd" | "busy" | "offline";
      roles?: string[];
    }
  ): Promise<User> {
    // 1. Mettre à jour l'utilisateur dans Supabase Auth si nécessaire
    if (data.email || data.password) {
      const updateData: any = {};
      if (data.email) updateData.email = data.email;
      if (data.password) updateData.password = data.password;

      const { error: authError } = await supabase.auth.admin.updateUserById(id, updateData);
      if (authError) throw authError;
    }

    // 2. Mettre à jour le profil dans public.users
    const profileUpdateData: any = {};
    if (data.username !== undefined) profileUpdateData.username = data.username;
    if (data.firstname !== undefined) profileUpdateData.firstname = data.firstname;
    if (data.lastname !== undefined) profileUpdateData.lastname = data.lastname;
    if (data.color !== undefined) profileUpdateData.color = data.color;
    if (data.code_gestionnaire !== undefined) profileUpdateData.code_gestionnaire = data.code_gestionnaire;
    if (data.status !== undefined) profileUpdateData.status = data.status;

    if (Object.keys(profileUpdateData).length > 0) {
      const { error: profileError } = await supabase
        .from("users")
        .update(profileUpdateData)
        .eq("id", id);

      if (profileError) throw profileError;
    }

    // 3. Mettre à jour les rôles si spécifiés
    if (data.roles !== undefined) {
      await this.updateRoles(id, data.roles);
    }

    // 4. Récupérer l'utilisateur mis à jour
    return await this.getById(id);
  },

  // Supprimer un utilisateur (soft delete)
  async delete(id: string): Promise<{ message: string; data: User }> {
    // 1. Soft delete dans public.users
    const { data: userData, error: profileError } = await supabase
      .from("users")
      .update({ 
        is_active: false,
        status: "offline",
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (profileError) throw profileError;

    // 2. Supprimer l'utilisateur de Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) throw authError;

    return {
      message: "User deleted successfully",
      data: userData,
    };
  },

  // Assigner des rôles à un utilisateur
  async assignRoles(userId: string, roleNames: string[]): Promise<void> {
    // Récupérer les IDs des rôles
    const { data: roles, error: rolesError } = await supabase
      .from("roles")
      .select("id, name")
      .in("name", roleNames);

    if (rolesError) throw rolesError;

    const roleIds = roles?.map(role => role.id) || [];

    if (roleIds.length === 0) {
      throw new Error("No valid roles found");
    }

    // Supprimer les rôles existants
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    // Ajouter les nouveaux rôles
    const userRoles = roleIds.map(roleId => ({
      user_id: userId,
      role_id: roleId,
    }));

    const { error: assignError } = await supabase
      .from("user_roles")
      .insert(userRoles);

    if (assignError) throw assignError;
  },

  // Mettre à jour les rôles d'un utilisateur
  async updateRoles(userId: string, roleNames: string[]): Promise<void> {
    await this.assignRoles(userId, roleNames);
  },

  // Récupérer les permissions d'un utilisateur
  async getUserPermissions(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("user_roles")
      .select(`
        roles!inner(
          role_permissions!inner(
            permissions!inner(
              key
            )
          )
        )
      `)
      .eq("user_id", userId);

    if (error) throw error;

    const permissions = new Set<string>();
    data?.forEach((userRole: any) => {
      userRole.roles?.role_permissions?.forEach((rp: any) => {
        if (rp.permissions?.key) {
          permissions.add(rp.permissions.key);
        }
      });
    });

    return Array.from(permissions);
  },

  // Vérifier si un utilisateur a une permission
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permission);
  },

  // Récupérer les utilisateurs par rôle
  async getUsersByRole(roleName: string): Promise<User[]> {
    const { data, error } = await supabase
      .from("users")
      .select(`
        *,
        user_roles!inner(
          role_id,
          roles!inner(
            id,
            name,
            description
          )
        )
      `)
      .eq("user_roles.roles.name", roleName);

    if (error) throw error;

    return (data || []).map((item) => ({
      ...item,
      roles: item.user_roles?.map((ur: any) => ur.roles?.name).filter(Boolean) || [],
    }));
  },

  // Synchroniser un utilisateur existant (pour migration)
  async syncUser(authUserId: string, profileData: {
    username: string;
    firstname?: string;
    lastname?: string;
    color?: string;
    code_gestionnaire?: string;
    roles?: string[];
  }): Promise<User> {
    // 1. Vérifier que l'utilisateur existe dans auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(authUserId);
    if (authError || !authUser.user) {
      throw new Error("Auth user not found");
    }

    // 2. Créer ou mettre à jour le profil dans public.users
    const { data: profileDataResult, error: profileError } = await supabase
      .from("users")
      .upsert({
        id: authUserId, // Même ID que auth.users
        username: profileData.username,
        email: authUser.user.email,
        firstname: profileData.firstname,
        lastname: profileData.lastname,
        color: profileData.color,
        code_gestionnaire: profileData.code_gestionnaire,
        status: "offline",
        token_version: 0,
      })
      .select()
      .single();

    if (profileError) throw profileError;

    // 3. Assigner les rôles si spécifiés
    if (profileData.roles && profileData.roles.length > 0) {
      await this.assignRoles(authUserId, profileData.roles);
    }

    // 4. Récupérer l'utilisateur complet
    return await this.getById(authUserId);
  },

  // Récupérer les statistiques des utilisateurs
  async getStats(): Promise<{
    total: number;
    by_status: Record<string, number>;
    by_role: Record<string, number>;
    active_today: number;
  }> {
    const { data: users, error } = await supabase
      .from("users")
      .select(`
        status,
        user_roles!inner(
          roles!inner(
            name
          )
        ),
        last_seen_at
      `);

    if (error) throw error;

    const stats = {
      total: users?.length || 0,
      by_status: {} as Record<string, number>,
      by_role: {} as Record<string, number>,
      active_today: 0,
    };

    const today = new Date().toISOString().split('T')[0];

    users?.forEach((user: any) => {
      // Par statut
      const status = user.status || 'offline';
      stats.by_status[status] = (stats.by_status[status] || 0) + 1;

      // Par rôle
      user.user_roles?.forEach((ur: any) => {
        const roleName = ur.roles?.name;
        if (roleName) {
          stats.by_role[roleName] = (stats.by_role[roleName] || 0) + 1;
        }
      });

      // Actif aujourd'hui
      if (user.last_seen_at && user.last_seen_at.startsWith(today)) {
        stats.active_today++;
      }
    });

    return stats;
  },
};

// ===== API ROLES V2 =====

export const rolesApiV2 = {
  // Récupérer tous les rôles
  async getAll(): Promise<any[]> {
    const { data, error } = await supabase
      .from("roles")
      .select(`
        *,
        role_permissions!inner(
          permissions!inner(
            id,
            key,
            description
          )
        )
      `)
      .order("name");

    if (error) throw error;

    return (data || []).map((role) => ({
      ...role,
      permissions: role.role_permissions?.map((rp: any) => rp.permissions) || [],
    }));
  },

  // Créer un rôle
  async create(data: {
    name: string;
    description?: string;
    permissions?: string[];
  }): Promise<any> {
    const { data: role, error: roleError } = await supabase
      .from("roles")
      .insert({
        name: data.name,
        description: data.description,
      })
      .select()
      .single();

    if (roleError) throw roleError;

    // Assigner les permissions si spécifiées
    if (data.permissions && data.permissions.length > 0) {
      await this.assignPermissions(role.id, data.permissions);
    }

    return role;
  },

  // Assigner des permissions à un rôle
  async assignPermissions(roleId: string, permissionKeys: string[]): Promise<void> {
    // Récupérer les IDs des permissions
    const { data: permissions, error: permissionsError } = await supabase
      .from("permissions")
      .select("id, key")
      .in("key", permissionKeys);

    if (permissionsError) throw permissionsError;

    const permissionIds = permissions?.map(permission => permission.id) || [];

    if (permissionIds.length === 0) {
      throw new Error("No valid permissions found");
    }

    // Supprimer les permissions existantes
    await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId);

    // Ajouter les nouvelles permissions
    const rolePermissions = permissionIds.map(permissionId => ({
      role_id: roleId,
      permission_id: permissionId,
    }));

    const { error: assignError } = await supabase
      .from("role_permissions")
      .insert(rolePermissions);

    if (assignError) throw assignError;
  },
};

// ===== API PERMISSIONS V2 =====

export const permissionsApiV2 = {
  // Récupérer toutes les permissions
  async getAll(): Promise<any[]> {
    const { data, error } = await supabase
      .from("permissions")
      .select("*")
      .order("key");

    if (error) throw error;
    return data || [];
  },

  // Créer une permission
  async create(data: {
    key: string;
    description?: string;
  }): Promise<any> {
    const { data: permission, error } = await supabase
      .from("permissions")
      .insert({
        key: data.key,
        description: data.description,
      })
      .select()
      .single();

    if (error) throw error;
    return permission;
  },
};

// ===== API UTILITAIRES =====

export const utilsApi = {
  // Fonction pour convertir un fichier en base64
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Retirer le préfixe "data:image/jpeg;base64," par exemple
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  },

  // Fonction pour obtenir la taille d'un fichier en format lisible
  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },

  // Fonction pour valider un type MIME
  isValidMimeType(mimeType: string): boolean {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    return allowedTypes.includes(mimeType);
  },

  // Fonction pour générer un mot de passe sécurisé
  generateSecurePassword(length: number = 12): string {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  },

  // Fonction pour valider un email
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Fonction pour valider un nom d'utilisateur
  isValidUsername(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    return usernameRegex.test(username);
  },

  // Fonction pour générer un code gestionnaire unique
  async generateUniqueCodeGestionnaire(firstname: string, lastname: string): Promise<string> {
    const baseCode = `${firstname.charAt(0).toUpperCase()}${lastname.charAt(0).toUpperCase()}`;
    let code = baseCode;
    let counter = 1;

    while (true) {
      const { data, error } = await supabase
        .from("users")
        .select("code_gestionnaire")
        .eq("code_gestionnaire", code)
        .single();

      if (error && error.code === 'PGRST116') {
        // Code n'existe pas, on peut l'utiliser
        break;
      } else if (error) {
        throw error;
      }

      // Code existe, essayer avec un numéro
      code = `${baseCode}${counter}`;
      counter++;
    }

    return code;
  },

};

/**
 * Obtient le nombre total d'interventions correspondant aux filtres fournis
 * sans récupérer les enregistrements.
 * @param params - Filtres optionnels à appliquer
 * @returns Nombre total d'interventions correspondant
 */
export async function getInterventionTotalCount(
  params?: Omit<GetAllParams, "limit" | "offset" | "fields" | "sortBy" | "sortDir">
): Promise<number> {
  let query = supabase
    .from("interventions")
    .select("id", { count: "exact", head: true });

  if (params?.statut) {
    if (Array.isArray(params.statut)) {
      query = query.in("statut_id", params.statut);
    } else {
      query = query.eq("statut_id", params.statut);
    }
  }

  if (params?.agence) {
    if (Array.isArray(params.agence)) {
      query = query.in("agence_id", params.agence);
    } else {
      query = query.eq("agence_id", params.agence);
    }
  }
  if (params?.metier) {
    if (Array.isArray(params.metier)) {
      query = query.in("metier_id", params.metier);
    } else {
      query = query.eq("metier_id", params.metier);
    }
  }

  // ⚠️ TODO: Le filtre artisan nécessite un JOIN avec intervention_artisans
  // if (params?.artisan) { ... }

  if (params?.user !== undefined) {
    if (params.user === null) {
      // Filtre pour les interventions sans assignation (vue Market)
      query = query.is("assigned_user_id", null);
    } else if (Array.isArray(params.user)) {
      query = query.in("assigned_user_id", params.user);
    } else {
      query = query.eq("assigned_user_id", params.user);
    }
  }

  if (params?.startDate) {
    query = query.gte("date", params.startDate);
  }

  if (params?.endDate) {
    query = query.lte("date", params.endDate);
  }

  if (params?.search) {
    query = query.ilike("contexte_intervention", `%${params.search}%`);
  }

  const { count, error } = await query;
  if (error) throw error;

  return count ?? 0;
}

/**
 * Obtient le nombre d'interventions par statut (pour les pastilles de vues)
 * @param params - Filtres à appliquer (user, agence, dates, etc.)
 * @returns Objet avec statut_id → count
 */
export async function getInterventionCounts(
  params?: Omit<GetDistinctParams, "statut">
): Promise<Record<string, number>> {
  let query = supabase
    .from("interventions")
    .select("statut_id", { count: "exact", head: false });

  // Appliquer les filtres (sauf statut puisqu'on compte PAR statut)
  if (params?.agence) {
    if (Array.isArray(params.agence)) {
      query = query.in("agence_id", params.agence);
    } else {
      query = query.eq("agence_id", params.agence);
    }
  }
  if (params?.user !== undefined) {
    if (params.user === null) {
      // Filtre pour les interventions sans assignation (vue Market)
      query = query.is("assigned_user_id", null);
    } else if (Array.isArray(params.user)) {
      query = query.in("assigned_user_id", params.user);
    } else {
      query = query.eq("assigned_user_id", params.user);
    }
  }
  if (params?.startDate) {
    query = query.gte("date", params.startDate);
  }
  if (params?.endDate) {
    query = query.lte("date", params.endDate);
  }
  if (params?.search) {
    query = query.ilike("contexte_intervention", `%${params.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data) return {};

  // Compter par statut_id
  const counts: Record<string, number> = {};
  for (const row of data) {
    const statusId = row.statut_id;
    if (statusId) {
      counts[statusId] = (counts[statusId] || 0) + 1;
    }
  }

  return counts;
}

export async function getDistinctInterventionValues(
  property: string,
  params?: GetDistinctParams,
): Promise<string[]> {
  const column = resolveColumn(property);
  if (!column) {
    return [];
  }

  const normalizedProperty = property.trim().toLowerCase();

  const resolveFromReferences = async (): Promise<string[] | null> => {
    switch (normalizedProperty) {
      case "statut":
      case "statut_id":
      case "statusvalue": {
        const { data } = await getReferenceCache();
        const statuses = data.interventionStatuses ?? [];
        const values = statuses
          .map((status) => status.label || status.code || status.id)
          .filter((value): value is string => Boolean(value));
        if (!values.length) return [];
        return Array.from(new Set(values)).sort((a, b) =>
          a.localeCompare(b, "fr", { sensitivity: "base" }),
        );
      }
      case "agence":
      case "agence_id": {
        const { data } = await getReferenceCache();
        const agencies = data.agencies ?? [];
        const values = agencies
          .map((agency) => agency.label || agency.code || agency.id)
          .filter((value): value is string => Boolean(value));
        if (!values.length) return [];
        return Array.from(new Set(values)).sort((a, b) =>
          a.localeCompare(b, "fr", { sensitivity: "base" }),
        );
      }
      case "attribuea":
      case "assigned_user_id": {
        const { data } = await getReferenceCache();
        const users = data.users ?? [];
        const values = users
          .map((user) => {
            const fullName = `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim();
            return fullName || user.username || user.id;
          })
          .filter((value): value is string => Boolean(value));
        if (!values.length) return [];
        return Array.from(new Set(values)).sort((a, b) =>
          a.localeCompare(b, "fr", { sensitivity: "base" }),
        );
      }
      case "metier":
      case "metier_id": {
        const { data } = await getReferenceCache();
        const metiers = data.metiers ?? [];
        const values = metiers
          .map((metier) => metier.label || metier.code || metier.id)
          .filter((value): value is string => Boolean(value));
        if (!values.length) return [];
        return Array.from(new Set(values)).sort((a, b) =>
          a.localeCompare(b, "fr", { sensitivity: "base" }),
        );
      }
      // Colonnes calculées depuis intervention_costs (pas de colonnes directes dans interventions)
      case "coutintervention":
      case "coutsst":
      case "coutmateriel":
      case "marge": {
        // Ces valeurs sont calculées dynamiquement, on ne peut pas les extraire facilement
        // Retourner un tableau vide pour éviter les erreurs
        return [];
      }
      // Colonnes calculées depuis intervention_artisans
      case "artisan":
      case "deuxiemeartisan": {
        // Ces valeurs sont calculées dynamiquement depuis les relations
        return [];
      }
      default:
        return null;
    }
  };

  const referenceValues = await resolveFromReferences();
  if (referenceValues && referenceValues.length > 0) {
    return referenceValues;
  }

  const limit = Math.max(10, Math.min(params?.limit ?? 250, 1000));

  let query = supabase
    .from("interventions")
    .select(column, { head: false })
    .order(column, { ascending: true, nullsFirst: false })
    .not(column, "is", null)
    .limit(limit);

  if (params?.statut) {
    if (Array.isArray(params.statut)) {
      query = query.in("statut_id", params.statut);
    } else {
      query = query.eq("statut_id", params.statut);
    }
  }
  if (params?.agence) {
    if (Array.isArray(params.agence)) {
      query = query.in("agence_id", params.agence);
    } else {
      query = query.eq("agence_id", params.agence);
    }
  }
  // ⚠️ TODO: Le filtre artisan nécessite un JOIN avec intervention_artisans
  // if (params?.artisan) { ... }
  
  if (params?.user) {
    if (Array.isArray(params.user)) {
      query = query.in("assigned_user_id", params.user);
    } else {
      query = query.eq("assigned_user_id", params.user);
    }
  }
  if (params?.startDate) {
    query = query.gte("date", params.startDate);  // ⚠️ Colonne réelle = 'date'
  }
  if (params?.endDate) {
    query = query.lte("date", params.endDate);    // ⚠️ Colonne réelle = 'date'
  }

  const { data, error } = await query;
  if (error) {
    console.error(`Error fetching distinct values for column "${column}":`, error);
    throw error;
  }
  if (!data) return [];

  let refs: ReferenceCache | null = null;
  const ensureRefs = async () => {
    if (!refs) {
      refs = await getReferenceCache();
    }
    return refs;
  };

  const transformValue = async (raw: unknown): Promise<string | undefined> => {
    if (raw == null) return undefined;
    const value = String(raw);

    switch (property) {
      case "statusValue":
      case "statut":
      case "statut_id": {
        const { interventionStatusesById } = await ensureRefs();
        const status = interventionStatusesById.get(value);
        if (status?.code) return status.code;
        if (status?.label) return status.label;
        return value;
      }
      case "attribueA":
      case "assigned_user_id": {
        const { usersById } = await ensureRefs();
        const user = usersById.get(value);
        if (user) {
          const fullName = `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim();
          return fullName || user.username || value;
        }
        return value;
      }
      case "agence":
      case "agence_id": {
        const { agenciesById } = await ensureRefs();
        const agency = agenciesById.get(value);
        if (agency?.label) return agency.label;
        if (agency?.code) return agency.code;
        return value;
      }
      case "metier":
      case "metier_id": {
        const { metiersById } = await ensureRefs();
        const metier = metiersById.get(value);
        if (metier?.code) return metier.code;
        if (metier?.label) return metier.label;
        return value;
      }
      default:
        return value;
    }
  };

  const seen = new Set<string>();
  const values: string[] = [];

  for (const row of data) {
    const raw = row[column as keyof typeof row];
    if (raw == null || raw === "") continue;
    const displayValue = await transformValue(raw);
    if (!displayValue) continue;
    if (seen.has(displayValue)) continue;
    seen.add(displayValue);
    values.push(displayValue);
  }

  return values;
}

// Export des constantes
export const INTERVENTION_STATUS = [
  "Demandé",
  "Devis_Envoyé",
  "Accepté",
  "En_cours",
  "Visite_Technique",
  "Terminé",
  "Annulé",
  "Refusé",
  "STAND_BY",
  "SAV",
];

export const INTERVENTION_METIERS = [
  "Vitrerie",
  "Bricolage",
  "Plomberie",
  "Électricité",
  "Couvreur",
  "Menuiserie",
  "Chauffage",
  "Dépannage",
];

export const DOCUMENT_TYPES = {
  intervention: [
    "devis",
    "photos",
    "facture_gmbs",
    "facture_artisan",
    "facture_materiel",
    "rapport_intervention",
    "plan",
    "schema",
    "autre",
  ],
  artisan: [
    "certificat",
    "assurance",
    "siret",
    "kbis",
    "photo_profil",
    "portfolio",
    "autre",
  ],
};

export const COMMENT_TYPES = [
  "general",
  "technique",
  "commercial",
  "interne",
  "client",
  "artisan",
  "urgent",
  "suivi",
];
