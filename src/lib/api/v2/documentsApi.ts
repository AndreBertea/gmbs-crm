// ===== API DOCUMENTS V2 =====
// Gestion complète des documents

import type {
  ArtisanAttachment,
  CreateDocumentData,
  DocumentQueryParams,
  FileUploadData,
  InterventionAttachment,
  PaginatedResponse,
  SupportedDocumentTypes,
  UpdateDocumentData,
} from "./common/types";
import { SUPABASE_FUNCTIONS_URL, getHeaders, handleResponse } from "./common/utils";

export const documentsApi = {
  // Récupérer tous les documents
  async getAll(params?: DocumentQueryParams): Promise<PaginatedResponse<InterventionAttachment | ArtisanAttachment>> {
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

    const headers = await getHeaders();
    const response = await fetch(url, {
      headers,
    });
    return handleResponse(response);
  },

  // Récupérer un document par ID
  async getById(
    id: string,
    entityType: "intervention" | "artisan" = "intervention"
  ): Promise<InterventionAttachment | ArtisanAttachment> {
    const url = `${SUPABASE_FUNCTIONS_URL}/documents/documents/${id}?entity_type=${entityType}`;

    const headers = await getHeaders();
    const response = await fetch(url, {
      headers,
    });
    return handleResponse(response);
  },

  // Créer un document
  async create(data: CreateDocumentData): Promise<InterventionAttachment | ArtisanAttachment> {
    const headers = await getHeaders();
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/documents/documents`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  // Upload un document avec contenu
  async upload(data: FileUploadData): Promise<InterventionAttachment | ArtisanAttachment> {
    const headers = await getHeaders();
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/documents/documents/upload`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  // Modifier un document
  async update(
    id: string,
    data: UpdateDocumentData,
    entityType: "intervention" | "artisan" = "intervention"
  ): Promise<InterventionAttachment | ArtisanAttachment> {
    const url = `${SUPABASE_FUNCTIONS_URL}/documents/documents/${id}?entity_type=${entityType}`;

    const headers = await getHeaders();
    const response = await fetch(url, {
      method: "PUT",
      headers,
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

    const headers = await getHeaders();
    const response = await fetch(url, {
      method: "DELETE",
      headers,
    });
    return handleResponse(response);
  },

  // Obtenir les types de documents supportés
  async getSupportedTypes(): Promise<SupportedDocumentTypes> {
    const headers = await getHeaders();
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/documents/documents/types`,
      {
        headers,
      }
    );
    return handleResponse(response);
  },

  // Récupérer les documents d'une intervention
  async getByIntervention(interventionId: string, params?: DocumentQueryParams): Promise<PaginatedResponse<InterventionAttachment>> {
    return this.getAll({ ...params, entity_type: "intervention", entity_id: interventionId }) as Promise<PaginatedResponse<InterventionAttachment>>;
  },

  // Récupérer les documents d'un artisan
  async getByArtisan(artisanId: string, params?: DocumentQueryParams): Promise<PaginatedResponse<ArtisanAttachment>> {
    return this.getAll({ ...params, entity_type: "artisan", entity_id: artisanId }) as Promise<PaginatedResponse<ArtisanAttachment>>;
  },

  // Récupérer les documents par type
  async getByKind(kind: string, params?: DocumentQueryParams): Promise<PaginatedResponse<InterventionAttachment | ArtisanAttachment>> {
    return this.getAll({ ...params, kind });
  },

  // Récupérer les documents par créateur
  async getByCreator(creatorId: string, params?: DocumentQueryParams): Promise<PaginatedResponse<InterventionAttachment | ArtisanAttachment>> {
    const searchParams = new URLSearchParams();
    searchParams.append("created_by", creatorId);
    if (params?.entity_type) searchParams.append("entity_type", params.entity_type);
    if (params?.entity_id) searchParams.append("entity_id", params.entity_id);
    if (params?.kind) searchParams.append("kind", params.kind);
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());

    const url = `${SUPABASE_FUNCTIONS_URL}/documents/documents/search?${searchParams.toString()}`;

    const headers = await getHeaders();
    const response = await fetch(url, {
      headers,
    });
    return handleResponse(response);
  },

  // Rechercher des documents par nom de fichier
  async searchByFilename(filename: string, params?: DocumentQueryParams): Promise<PaginatedResponse<InterventionAttachment | ArtisanAttachment>> {
    const searchParams = new URLSearchParams();
    searchParams.append("filename", filename);
    if (params?.entity_type) searchParams.append("entity_type", params.entity_type);
    if (params?.entity_id) searchParams.append("entity_id", params.entity_id);
    if (params?.kind) searchParams.append("kind", params.kind);
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());

    const url = `${SUPABASE_FUNCTIONS_URL}/documents/documents/search?${searchParams.toString()}`;

    const headers = await getHeaders();
    const response = await fetch(url, {
      headers,
    });
    return handleResponse(response);
  },

  // Obtenir les statistiques des documents
  async getStats(params?: { entity_type?: "intervention" | "artisan"; entity_id?: string }): Promise<{
    total: number;
    by_type: Record<string, number>;
    by_entity: Record<string, number>;
    by_kind: Record<string, number>;
    total_size: number;
    recent_count: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.entity_type) searchParams.append("entity_type", params.entity_type);
    if (params?.entity_id) searchParams.append("entity_id", params.entity_id);

    const url = `${SUPABASE_FUNCTIONS_URL}/documents/documents/stats${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;

    const headers = await getHeaders();
    const response = await fetch(url, {
      headers,
    });
    return handleResponse(response);
  },

  // Créer plusieurs documents en lot
  async createBulk(documents: CreateDocumentData[]): Promise<{
    success: number;
    errors: number;
    details: Array<{
      item: CreateDocumentData;
      success: boolean;
      data?: any;
      error?: string;
    }>;
  }> {
    const results = { success: 0, errors: 0, details: [] as any[] };

    for (const document of documents) {
      try {
        const result = await this.create(document);
        results.success++;
        results.details.push({ item: document, success: true, data: result });
      } catch (error: any) {
        results.errors++;
        results.details.push({ item: document, success: false, error: error.message });
      }
    }

    return results;
  },

  // Upload plusieurs fichiers en lot
  async uploadBulk(files: FileUploadData[]): Promise<{
    success: number;
    errors: number;
    details: Array<{
      item: FileUploadData;
      success: boolean;
      data?: any;
      error?: string;
    }>;
  }> {
    const results = { success: 0, errors: 0, details: [] as any[] };

    for (const file of files) {
      try {
        const result = await this.upload(file);
        results.success++;
        results.details.push({ item: file, success: true, data: result });
      } catch (error: any) {
        results.errors++;
        results.details.push({ item: file, success: false, error: error.message });
      }
    }

    return results;
  },
};
