// ===== TYPES COMMUNS POUR L'API V2 =====
// Types partagés entre toutes les APIs

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

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
  plain_nom: string | null;
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
  tenant_id: string | null;
  owner_id: string | null;
  client_id?: string | null;
  artisan_id?: string | null;
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

export interface InterventionReminder {
  id: string;
  intervention_id: string;
  user_id: string;
  note: string | null;
  due_date: string | null;
  mentioned_user_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
  };
  mentioned_users?: Array<{
    id: string;
    firstname: string;
    lastname: string;
    email: string;
  }>;
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

export interface Client {
  id: string;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  key: string;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Types pour les paramètres de requête
export interface BaseQueryParams {
  limit?: number;
  offset?: number;
}

export interface UserQueryParams extends BaseQueryParams {
  status?: string;
  role?: string;
}

export interface InterventionQueryParams extends BaseQueryParams {
  statut?: string;
  agence?: string;
  artisan?: string;
  user?: string;
  startDate?: string;
  endDate?: string;
  include?: string[];
}

export interface ArtisanQueryParams extends BaseQueryParams {
  statut?: string;
  metier?: string;
  zone?: string;
  gestionnaire?: string;
}

export interface DocumentQueryParams extends BaseQueryParams {
  entity_type?: "intervention" | "artisan";
  entity_id?: string;
  kind?: string;
}

export interface CommentQueryParams extends BaseQueryParams {
  entity_type?: "intervention" | "artisan" | "client";
  entity_id?: string;
  comment_type?: string;
  is_internal?: boolean;
  author_id?: string;
}

// Types pour les données de création/mise à jour
export interface CreateUserData {
  email: string;
  password: string;
  username: string;
  firstname?: string;
  lastname?: string;
  color?: string;
  code_gestionnaire?: string;
  roles?: string[];
}

export interface UpdateUserData {
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

export interface CreateInterventionData {
  agence_id?: string;
  tenant_id?: string;
  owner_id?: string;
  client_id?: string;
  artisan_id?: string;
  assigned_user_id?: string;
  statut_id?: string;
  metier_id?: string;
  date: string;
  date_prevue?: string | null;
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

export interface UpdateInterventionData {
  agence_id?: string;
  tenant_id?: string | null;
  owner_id?: string | null;
  client_id?: string | null;
  artisan_id?: string;
  assigned_user_id?: string;
  statut_id?: string;
  metier_id?: string;
  date?: string;
  date_termine?: string | null;
  date_prevue?: string | null;
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

export interface CreateArtisanData {
  prenom?: string;
  nom?: string;
  plain_nom?: string;
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
}

export interface UpdateArtisanData {
  prenom?: string;
  nom?: string;
  plain_nom?: string;
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

export interface CreateClientData {
  firstname?: string;
  lastname?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  code_postal?: string;
}

export interface UpdateClientData {
  firstname?: string;
  lastname?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  code_postal?: string;
}

export interface CreateDocumentData {
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
}

export interface UpdateDocumentData {
  kind?: string;
  filename?: string;
  mime_type?: string;
  file_size?: number;
  created_by?: string | null;
  created_by_display?: string | null;
  created_by_code?: string | null;
  created_by_color?: string | null;
}

export interface CreateCommentData {
  entity_id: string;
  entity_type: "intervention" | "artisan" | "client";
  content: string;
  comment_type?: string;
  is_internal?: boolean;
  author_id?: string;
}

export interface UpdateCommentData {
  content?: string;
  comment_type?: string;
  is_internal?: boolean;
}

export interface CreateRoleData {
  name: string;
  description?: string;
  permissions?: string[];
}

export interface CreatePermissionData {
  key: string;
  description?: string;
}

// Types pour les réponses d'API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface BulkOperationResult {
  success: number;
  errors: number;
  details: Array<{
    item: any;
    success: boolean;
    data?: any;
    error?: string;
  }>;
}

// Types pour les statistiques
export interface UserStats {
  total: number;
  by_status: Record<string, number>;
  by_role: Record<string, number>;
  active_today: number;
}

export interface CommentStats {
  total: number;
  by_type: Record<string, number>;
  by_internal: { internal: number; external: number };
  recent_count: number;
}

// Types pour les utilitaires
export interface FileUploadData {
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
}

export interface SupportedDocumentTypes {
  supported_types: Record<string, string[]>;
  max_file_size: string;
  allowed_mime_types: string[];
}

export interface SupportedCommentTypes {
  comment_types: string[];
  entity_types: string[];
  default_type: string;
  internal_default: boolean;
}

// ===== TYPES POUR LES TENANTS (LOCATAIRES) =====

export interface Tenant {
  id: string;
  external_ref: string | null;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  telephone: string | null;
  telephone2: string | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTenantData {
  external_ref?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  email?: string | null;
  telephone?: string | null;
  telephone2?: string | null;
  adresse?: string | null;
  ville?: string | null;
  code_postal?: string | null;
}

export interface UpdateTenantData {
  firstname?: string | null;
  lastname?: string | null;
  email?: string | null;
  telephone?: string | null;
  telephone2?: string | null;
  adresse?: string | null;
  ville?: string | null;
  code_postal?: string | null;
}

export interface TenantQueryParams extends BaseQueryParams {
  email?: string;
  telephone?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  paginated?: boolean;
}

// ===== TYPES POUR LES OWNERS (PROPRIÉTAIRES) =====

export interface Owner {
  id: string;
  external_ref: string | null;
  owner_firstname: string | null;
  owner_lastname: string | null;
  telephone: string | null;
  telephone2: string | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateOwnerData {
  external_ref?: string | null;
  owner_firstname?: string | null;
  owner_lastname?: string | null;
  telephone?: string | null;
  telephone2?: string | null;
  adresse?: string | null;
  ville?: string | null;
  code_postal?: string | null;
}

export interface UpdateOwnerData {
  owner_firstname?: string | null;
  owner_lastname?: string | null;
  telephone?: string | null;
  telephone2?: string | null;
  adresse?: string | null;
  ville?: string | null;
  code_postal?: string | null;
}

export interface OwnerQueryParams extends BaseQueryParams {
  telephone?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  paginated?: boolean;
}
