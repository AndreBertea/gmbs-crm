# 🚀 GUIDELINES COMPLÈTES - API v2 GMBS CRM

## 📋 Table des Matières
1. [Architecture et Imports](#architecture-et-imports)
2. [Utilisation des APIs](#utilisation-des-apis)
3. [Hooks Personnalisés](#hooks-personnalisés)
4. [Gestion des Erreurs](#gestion-des-erreurs)
5. [Extension de l'API](#extension-de-lapi)
6. [Bonnes Pratiques](#bonnes-pratiques)
7. [Exemples Pratiques](#exemples-pratiques)

---

## 🏗️ Architecture et Imports

### Structure de l'API v2
```
src/lib/supabase-api-v2.ts
├── interventionsApiV2    # CRUD interventions
├── artisansApiV2         # CRUD artisans  
├── documentsApi          # Gestion documents
├── commentsApi           # Système commentaires
└── Types & Interfaces    # Types TypeScript
```

### Import Standard
```typescript
// ✅ CORRECT - Import des APIs spécifiques
import { 
  interventionsApiV2, 
  artisansApiV2, 
  documentsApi, 
  commentsApi,
  type Intervention,
  type Artisan 
} from '@/lib/supabase-api-v2';

// ✅ CORRECT - Import des hooks personnalisés
import { useInterventions } from '@/hooks/useInterventions';
import { useArtisans } from '@/hooks/useArtisans';
```

### ❌ Éviter
```typescript
// ❌ INCORRECT - Import de tout l'API
import * as api from '@/lib/supabase-api-v2';

// ❌ INCORRECT - Import direct du client Supabase
import { supabase } from '@/lib/supabase-client';
```

---

## 🔧 Utilisation des APIs

### 1. Interventions API

#### Créer une intervention
```typescript
import { interventionsApiV2 } from '@/lib/supabase-api-v2';

const createIntervention = async () => {
  try {
    const intervention = await interventionsApiV2.create({
      date: new Date().toISOString(),
      contexte_intervention: 'Réparation urgente de plomberie',
      adresse: '123 Rue de la Paix',
      ville: 'Paris',
      code_postal: '75001',
      agence_id: 'agence-uuid',
      statut_id: 'DEMANDE',
      metier_id: 'PLOMBERIE'
    });
    
    console.log('Intervention créée:', intervention);
    return intervention;
  } catch (error) {
    console.error('Erreur création intervention:', error);
    throw error;
  }
};
```

#### Récupérer les interventions
```typescript
// Avec pagination et filtres
const loadInterventions = async () => {
  const result = await interventionsApiV2.getAll({
    limit: 50,
    offset: 0,
    statut: 'DEMANDE',
    agence: 'agence-uuid',
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  });
  
  return result.data;
};

// Avec relations
const loadInterventionsWithRelations = async () => {
  const result = await interventionsApiV2.getAll({
    include: ['artisans', 'costs', 'payments', 'attachments']
  });
  
  return result.data;
};
```

#### Mettre à jour une intervention
```typescript
const updateIntervention = async (id: string, updates: Partial<Intervention>) => {
  try {
    const updated = await interventionsApiV2.update(id, {
      statut_id: 'EN_COURS',
      contexte_intervention: 'Intervention en cours de réalisation'
    });
    
    return updated;
  } catch (error) {
    console.error('Erreur mise à jour:', error);
    throw error;
  }
};
```

### 2. Artisans API

#### Créer un artisan
```typescript
import { artisansApiV2 } from '@/lib/supabase-api-v2';

const createArtisan = async () => {
  const artisan = await artisansApiV2.create({
    raison_sociale: 'Entreprise Dupont',
    siret: '12345678901234',
    email: 'contact@dupont.fr',
    telephone: '0123456789',
    adresse: '456 Avenue des Champs',
    ville: 'Lyon',
    code_postal: '69000',
    statut_id: 'ACTIF',
    gestionnaire_id: 'user-uuid'
  });
  
  return artisan;
};
```

#### Assigner des métiers à un artisan
```typescript
const assignMetiers = async (artisanId: string, metierIds: string[]) => {
  for (const metierId of metierIds) {
    await artisansApiV2.assignMetier(artisanId, metierId);
  }
};
```

### 3. Documents API

#### Uploader un document
```typescript
import { documentsApi } from '@/lib/supabase-api-v2';

const uploadDocument = async (file: File, interventionId: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('entity_id', interventionId);
  formData.append('entity_type', 'intervention');
  formData.append('kind', 'devis');
  formData.append('description', 'Devis pour intervention');

  const document = await documentsApi.upload(formData);
  return document;
};
```

### 4. Commentaires API

#### Ajouter un commentaire
```typescript
import { commentsApi } from '@/lib/supabase-api-v2';

const addComment = async (interventionId: string, content: string) => {
  const comment = await commentsApi.create({
    entity_id: interventionId,
    entity_type: 'intervention',
    content: content,
    comment_type: 'internal'
  });
  
  return comment;
};
```

---

## 🎣 Hooks Personnalisés

### Utilisation des Hooks

#### Hook Interventions
```typescript
import { useInterventions } from '@/hooks/useInterventions';

function InterventionsPage() {
  const {
    interventions,
    setInterventions,
    loading,
    error,
    hasMore,
    totalCount,
    loadMore,
    refresh,
    setFilters
  } = useInterventions({
    limit: 50,
    autoLoad: true
  });

  // Filtrage
  const handleFilterChange = (filters: any) => {
    setFilters(filters);
  };

  // Chargement de plus de données
  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadMore();
    }
  };

  return (
    <div>
      {interventions.map(intervention => (
        <InterventionCard key={intervention.id} intervention={intervention} />
      ))}
      
      {hasMore && (
        <Button onClick={handleLoadMore} disabled={loading}>
          Charger plus
        </Button>
      )}
    </div>
  );
}
```

#### Hook Artisans
```typescript
import { useArtisans } from '@/hooks/useArtisans';

function ArtisansPage() {
  const {
    artisans,
    setArtisans,
    loading,
    error,
    hasMore,
    totalCount,
    loadMore,
    refresh,
    setFilters
  } = useArtisans({
    limit: 30,
    autoLoad: true
  });

  return (
    <div>
      <p>Total: {totalCount} artisans</p>
      {artisans.map(artisan => (
        <ArtisanCard key={artisan.id} artisan={artisan} />
      ))}
    </div>
  );
}
```

---

## ⚠️ Gestion des Erreurs

### Pattern de Gestion d'Erreurs
```typescript
const handleApiCall = async () => {
  try {
    const result = await interventionsApiV2.create(data);
    return result;
  } catch (error) {
    // Log de l'erreur
    console.error('Erreur API:', error);
    
    // Gestion spécifique par type d'erreur
    if (error.message.includes('HTTP 400')) {
      // Erreur de validation
      showError('Données invalides');
    } else if (error.message.includes('HTTP 500')) {
      // Erreur serveur
      showError('Erreur serveur, réessayez plus tard');
    } else {
      // Erreur générique
      showError('Une erreur est survenue');
    }
    
    throw error;
  }
};
```

### Hook de Gestion d'Erreurs
```typescript
import { useState, useCallback } from 'react';

export function useErrorHandler() {
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((error: any) => {
    console.error('Erreur:', error);
    setError(error.message || 'Une erreur est survenue');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
}
```

---

## 🔧 Extension de l'API

### 1. Ajouter un Nouveau Champ à l'API

#### Étape 1: Mettre à jour les Types
```typescript
// Dans src/lib/supabase-api-v2.ts
export interface Intervention {
  // ... champs existants
  nouveau_champ?: string;  // Nouveau champ
  autre_champ?: number;    // Autre nouveau champ
}
```

#### Étape 2: Mettre à jour l'Edge Function
```typescript
// Dans supabase/functions/interventions-v2/index.ts
interface CreateInterventionRequest {
  // ... champs existants
  nouveau_champ?: string;
  autre_champ?: number;
}

interface UpdateInterventionRequest {
  // ... champs existants
  nouveau_champ?: string;
  autre_champ?: number;
}
```

#### Étape 3: Mettre à jour la Logique de Création
```typescript
// Dans la fonction POST
const { data: intervention, error } = await supabase
  .from('interventions')
  .insert({
    // ... champs existants
    nouveau_champ: body.nouveau_champ,
    autre_champ: body.autre_champ
  })
  .select()
  .single();
```

#### Étape 4: Mettre à jour la Logique de Mise à Jour
```typescript
// Dans la fonction PUT
const updateData: any = {};
if (body.nouveau_champ !== undefined) updateData.nouveau_champ = body.nouveau_champ;
if (body.autre_champ !== undefined) updateData.autre_champ = body.autre_champ;

const { data: intervention, error } = await supabase
  .from('interventions')
  .update(updateData)
  .eq('id', resourceId)
  .select()
  .single();
```

### 2. Créer une Nouvelle API

#### Étape 1: Créer l'Edge Function
```bash
# Créer le dossier
mkdir supabase/functions/nouvelle-api

# Créer le fichier index.ts
touch supabase/functions/nouvelle-api/index.ts
```

#### Étape 2: Structure de Base
```typescript
// supabase/functions/nouvelle-api/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const resource = pathParts[2]; // nouvelle-api/resource
    const resourceId = pathParts[3]; // nouvelle-api/resource/id

    switch (req.method) {
      case 'GET':
        if (resourceId) {
          // GET /nouvelle-api/resource/id
          return await getById(supabase, resourceId);
        } else {
          // GET /nouvelle-api/resource
          return await getAll(supabase, url.searchParams);
        }

      case 'POST':
        // POST /nouvelle-api/resource
        return await create(supabase, await req.json());

      case 'PUT':
        // PUT /nouvelle-api/resource/id
        return await update(supabase, resourceId, await req.json());

      case 'DELETE':
        // DELETE /nouvelle-api/resource/id
        return await deleteById(supabase, resourceId);

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Implémentation des fonctions CRUD
async function getAll(supabase: any, params: URLSearchParams) {
  // Logique de récupération
}

async function getById(supabase: any, id: string) {
  // Logique de récupération par ID
}

async function create(supabase: any, data: any) {
  // Logique de création
}

async function update(supabase: any, id: string, data: any) {
  // Logique de mise à jour
}

async function deleteById(supabase: any, id: string) {
  // Logique de suppression
}
```

#### Étape 3: Ajouter au Client API
```typescript
// Dans src/lib/supabase-api-v2.ts

// Types
export interface NouvelleEntite {
  id: string;
  nom: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// API Client
export const nouvelleApi = {
  async getAll(params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<NouvelleEntite>> {
    const url = new URL(`${SUPABASE_FUNCTIONS_URL}/nouvelle-api/entites`);
    if (params?.limit) url.searchParams.set('limit', params.limit.toString());
    if (params?.offset) url.searchParams.set('offset', params.offset.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getHeaders(),
    });

    return handleResponse(response);
  },

  async getById(id: string): Promise<NouvelleEntite> {
    const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/nouvelle-api/entites/${id}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    return handleResponse(response);
  },

  async create(data: Partial<NouvelleEntite>): Promise<NouvelleEntite> {
    const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/nouvelle-api/entites`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse(response);
  },

  async update(id: string, data: Partial<NouvelleEntite>): Promise<NouvelleEntite> {
    const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/nouvelle-api/entites/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse(response);
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/nouvelle-api/entites/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
  },
};
```

#### Étape 4: Créer un Hook Personnalisé
```typescript
// src/hooks/useNouvelleEntite.ts
import { useState, useEffect, useCallback } from 'react';
import { nouvelleApi, type NouvelleEntite } from '@/lib/supabase-api-v2';

interface UseNouvelleEntiteOptions {
  limit?: number;
  autoLoad?: boolean;
}

interface UseNouvelleEntiteReturn {
  entites: NouvelleEntite[];
  setEntites: React.Dispatch<React.SetStateAction<NouvelleEntite[]>>;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  create: (data: Partial<NouvelleEntite>) => Promise<NouvelleEntite>;
  update: (id: string, data: Partial<NouvelleEntite>) => Promise<NouvelleEntite>;
  delete: (id: string) => Promise<void>;
}

export function useNouvelleEntite(options: UseNouvelleEntiteOptions = {}): UseNouvelleEntiteReturn {
  const { limit = 50, autoLoad = true } = options;
  
  const [entites, setEntites] = useState<NouvelleEntite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);

  const loadData = useCallback(async (reset = false) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const currentOffset = reset ? 0 : offset;
      const result = await nouvelleApi.getAll({ limit, offset: currentOffset });
      
      if (reset) {
        setEntites(result.data);
        setOffset(limit);
      } else {
        setEntites(prev => [...prev, ...result.data]);
        setOffset(prev => prev + limit);
      }
      
      setTotalCount(result.pagination.total);
      setHasMore(result.pagination.hasMore);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [limit, offset, loading]);

  const loadMore = useCallback(() => loadData(false), [loadData]);
  const refresh = useCallback(() => loadData(true), [loadData]);

  const create = useCallback(async (data: Partial<NouvelleEntite>) => {
    const newEntite = await nouvelleApi.create(data);
    setEntites(prev => [newEntite, ...prev]);
    return newEntite;
  }, []);

  const update = useCallback(async (id: string, data: Partial<NouvelleEntite>) => {
    const updatedEntite = await nouvelleApi.update(id, data);
    setEntites(prev => prev.map(e => e.id === id ? updatedEntite : e));
    return updatedEntite;
  }, []);

  const deleteEntite = useCallback(async (id: string) => {
    await nouvelleApi.delete(id);
    setEntites(prev => prev.filter(e => e.id !== id));
  }, []);

  useEffect(() => {
    if (autoLoad) {
      loadData(true);
    }
  }, [autoLoad, loadData]);

  return {
    entites,
    setEntites,
    loading,
    error,
    hasMore,
    totalCount,
    loadMore,
    refresh,
    create,
    update,
    delete: deleteEntite,
  };
}
```

---

## ✅ Bonnes Pratiques

### 1. Structure des Composants
```typescript
// ✅ CORRECT - Composant avec gestion d'état locale
function InterventionForm() {
  const { create, loading } = useInterventions();
  const [formData, setFormData] = useState({});
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create(formData);
      // Succès
    } catch (error) {
      // Gestion d'erreur
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Formulaire */}
    </form>
  );
}
```

### 2. Optimisation des Requêtes
```typescript
// ✅ CORRECT - Utilisation du cache
const { interventions, refresh } = useInterventions({
  limit: 50,
  autoLoad: true
});

// Rafraîchir seulement si nécessaire
const handleRefresh = useCallback(() => {
  refresh();
}, [refresh]);
```

### 3. Gestion des États de Chargement
```typescript
// ✅ CORRECT - États de chargement spécifiques
function InterventionCard({ intervention }: { intervention: Intervention }) {
  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await interventionsApiV2.update(intervention.id, { statut_id: newStatus });
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <div>
      {isUpdating ? (
        <Spinner />
      ) : (
        <StatusButton onClick={() => handleStatusChange('EN_COURS')} />
      )}
    </div>
  );
}
```

### 4. Validation des Données
```typescript
// ✅ CORRECT - Validation avant envoi
const validateIntervention = (data: Partial<Intervention>) => {
  const errors: string[] = [];
  
  if (!data.contexte_intervention) {
    errors.push('Le contexte est requis');
  }
  
  if (!data.adresse) {
    errors.push('L\'adresse est requise');
  }
  
  return errors;
};

const handleCreate = async (data: Partial<Intervention>) => {
  const errors = validateIntervention(data);
  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
  
  return await interventionsApiV2.create(data);
};
```

---

## 🎯 Exemples Pratiques

### 1. Page de Liste avec Filtres
```typescript
function InterventionsPage() {
  const {
    interventions,
    loading,
    error,
    hasMore,
    loadMore,
    setFilters
  } = useInterventions({ limit: 50 });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setFilters({
      search: term,
      statut: statusFilter === 'all' ? undefined : statusFilter
    });
  }, [statusFilter, setFilters]);
  
  const handleStatusFilter = useCallback((status: string) => {
    setStatusFilter(status);
    setFilters({
      search: searchTerm,
      statut: status === 'all' ? undefined : status
    });
  }, [searchTerm, setFilters]);
  
  return (
    <div>
      <SearchInput value={searchTerm} onChange={handleSearch} />
      <StatusFilter value={statusFilter} onChange={handleStatusFilter} />
      
      {interventions.map(intervention => (
        <InterventionCard key={intervention.id} intervention={intervention} />
      ))}
      
      {hasMore && (
        <Button onClick={loadMore} disabled={loading}>
          Charger plus
        </Button>
      )}
    </div>
  );
}
```

### 2. Formulaire de Création
```typescript
function CreateInterventionForm() {
  const { create, loading } = useInterventions();
  const [formData, setFormData] = useState({
    contexte_intervention: '',
    adresse: '',
    ville: '',
    agence_id: '',
    statut_id: 'DEMANDE'
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const intervention = await create(formData);
      console.log('Intervention créée:', intervention);
      // Redirection ou mise à jour de l'état
    } catch (error) {
      console.error('Erreur:', error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.contexte_intervention}
        onChange={(e) => setFormData(prev => ({ ...prev, contexte_intervention: e.target.value }))}
        placeholder="Contexte de l'intervention"
        required
      />
      
      <input
        value={formData.adresse}
        onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
        placeholder="Adresse"
        required
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Création...' : 'Créer'}
      </button>
    </form>
  );
}
```

### 3. Gestion des Documents
```typescript
function DocumentUploader({ interventionId }: { interventionId: string }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity_id', interventionId);
      formData.append('entity_type', 'intervention');
      formData.append('kind', 'devis');
      
      const document = await documentsApi.upload(formData);
      console.log('Document uploadé:', document);
    } catch (error) {
      console.error('Erreur upload:', error);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };
  
  return (
    <div>
      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
        disabled={uploading}
      />
      
      {uploading && (
        <div>
          <div>Upload en cours... {progress}%</div>
          <ProgressBar value={progress} />
        </div>
      )}
    </div>
  );
}
```

---

## 🚀 Commandes Utiles

### Développement
```bash
# Démarrer Supabase local
supabase start

# Servir les Edge Functions
supabase functions serve

# Tester l'API
npm run test:api

# Lancer le site
npm run dev
```

### Déploiement
```bash
# Déployer les Edge Functions
supabase functions deploy

# Déployer le site
npm run build
npm run start
```

---

## 📚 Ressources Supplémentaires

- [Documentation Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [TypeScript Best Practices](https://typescript-eslint.io/rules/)
- [React Hooks Patterns](https://reactjs.org/docs/hooks-patterns.html)
- [API Design Guidelines](https://restfulapi.net/)

---

*Ce guide est maintenu à jour avec les dernières pratiques et évolutions de l'API v2 GMBS CRM.*
