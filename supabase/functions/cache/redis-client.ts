// Client Redis pour le cache distribué
// Utilise Deno KV pour la compatibilité avec les Edge Functions

interface CacheConfig {
  ttl: number; // Time to live en millisecondes
  prefix: string; // Préfixe pour les clés
}

class RedisCache {
  private kv: Deno.Kv;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    // Utilise Deno KV comme alternative à Redis dans les Edge Functions
    this.kv = Deno.openKv();
  }

  private getKey(key: string): string {
    return `${this.config.prefix}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const kvKey = this.getKey(key);
      const entry = await this.kv.get(kvKey);
      
      if (!entry.value) {
        return null;
      }

      const data = entry.value as { value: T; expiresAt: number };
      
      if (Date.now() > data.expiresAt) {
        await this.delete(key);
        return null;
      }

      return data.value;
    } catch (error) {
      console.error('Erreur Redis get:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const kvKey = this.getKey(key);
      const expiresAt = Date.now() + (ttl || this.config.ttl);
      
      await this.kv.set(kvKey, {
        value,
        expiresAt
      });
    } catch (error) {
      console.error('Erreur Redis set:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const kvKey = this.getKey(key);
      await this.kv.delete(kvKey);
    } catch (error) {
      console.error('Erreur Redis delete:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const entries = this.kv.list({ prefix: [this.config.prefix] });
      for await (const entry of entries) {
        await this.kv.delete(entry.key);
      }
    } catch (error) {
      console.error('Erreur Redis clear:', error);
    }
  }

  // Méthode pour obtenir un compteur avec cache Redis
  async getCount(supabase: any, table: string, filter?: string): Promise<number> {
    const cacheKey = `${table}_count${filter ? `_${filter}` : ''}`;
    
    // Vérifier le cache Redis
    const cached = await this.get<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    // Requête à la base de données
    let query = supabase.from(table).select('*', { count: 'exact', head: true });
    
    // Appliquer le filtre si fourni
    if (filter) {
      const [column, value] = filter.split('=');
      query = query.eq(column, value);
    }
    
    const { count } = await query;
    const result = count || 0;
    
    // Mettre en cache Redis (TTL plus long pour les compteurs)
    await this.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes
    
    return result;
  }

  // Méthode pour obtenir une liste avec cache Redis
  async getList<T>(key: string, fetchFn: () => Promise<T[]>): Promise<T[]> {
    // Vérifier le cache Redis
    const cached = await this.get<T[]>(key);
    if (cached !== null) {
      return cached;
    }
    
    // Récupérer les données
    const data = await fetchFn();
    
    // Mettre en cache Redis (TTL plus court pour les listes)
    await this.set(key, data, 2 * 60 * 1000); // 2 minutes
    
    return data;
  }

  // Méthode pour obtenir un détail avec cache Redis
  async getDetail<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    // Vérifier le cache Redis
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    // Récupérer les données
    const data = await fetchFn();
    
    // Mettre en cache Redis (TTL plus long pour les détails)
    await this.set(key, data, 10 * 60 * 1000); // 10 minutes
    
    return data;
  }

  // Invalidation intelligente
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const entries = this.kv.list({ prefix: [this.config.prefix, pattern] });
      for await (const entry of entries) {
        await this.kv.delete(entry.key);
      }
    } catch (error) {
      console.error('Erreur Redis invalidatePattern:', error);
    }
  }

  // Cache warming - préchargement des données fréquentes
  async warmCache(supabase: any): Promise<void> {
    try {
      console.log('🔥 Cache warming en cours...');
      
      // Précharger les compteurs
      await this.getCount(supabase, 'artisans', 'is_active=true');
      await this.getCount(supabase, 'interventions');
      
      // Précharger les premières pages
      const artisansQuery = () => supabase
        .from('artisans')
        .select('id, prenom, nom, telephone, email, raison_sociale, statut_dossier, statut_id, is_active, suivi_relances_docs, gestionnaire_id')
        .eq('is_active', true)
        .order('nom', { ascending: true })
        .order('prenom', { ascending: true })
        .limit(50);

      const interventionsQuery = () => supabase
        .from('interventions')
        .select('id, date, agence_id, contexte_intervention, adresse, ville, metier_id, statut_id, prenom_client, nom_client, telephone_client, cout_sst, assigned_user_id, numero_sst')
        .order('date', { ascending: false })
        .limit(50);

      await this.getList('artisans_page_1', artisansQuery);
      await this.getList('interventions_page_1', interventionsQuery);
      
      console.log('✅ Cache warming terminé');
    } catch (error) {
      console.error('❌ Erreur cache warming:', error);
    }
  }
}

// Instances de cache avec différents TTL
export const countersCache = new RedisCache({
  ttl: 5 * 60 * 1000, // 5 minutes
  prefix: 'counters'
});

export const listsCache = new RedisCache({
  ttl: 2 * 60 * 1000, // 2 minutes
  prefix: 'lists'
});

export const detailsCache = new RedisCache({
  ttl: 10 * 60 * 1000, // 10 minutes
  prefix: 'details'
});

// Fonctions utilitaires
export async function getArtisansCount(supabase: any, activeOnly: boolean = true): Promise<number> {
  const filter = activeOnly ? 'is_active=true' : undefined;
  return await countersCache.getCount(supabase, 'artisans', filter);
}

export async function getInterventionsCount(supabase: any): Promise<number> {
  return await countersCache.getCount(supabase, 'interventions');
}

export async function getArtisansList(supabase: any, params: any): Promise<any[]> {
  const cacheKey = `artisans_${JSON.stringify(params)}`;
  
  const fetchFn = async () => {
    let query = supabase
      .from('artisans')
      .select('id, prenom, nom, telephone, email, raison_sociale, statut_dossier, statut_id, is_active, suivi_relances_docs, gestionnaire_id')
      .eq('is_active', true)
      .order('nom', { ascending: true })
      .order('prenom', { ascending: true });

    if (params.statut) {
      query = query.eq('statut_id', params.statut);
    }
    if (params.zone) {
      query = query.eq('departement', params.zone);
    }
    if (params.cursor) {
      query = query.gt('id', params.cursor).limit(params.limit || 50);
    } else {
      query = query.range(params.offset || 0, (params.offset || 0) + (params.limit || 50) - 1);
    }

    const { data } = await query;
    return data || [];
  };

  return await listsCache.getList(cacheKey, fetchFn);
}

export async function getInterventionsList(supabase: any, params: any): Promise<any[]> {
  const cacheKey = `interventions_${JSON.stringify(params)}`;
  
  const fetchFn = async () => {
    let query = supabase
      .from('interventions')
      .select('id, date, agence_id, contexte_intervention, adresse, ville, metier_id, statut_id, prenom_client, nom_client, telephone_client, cout_sst, assigned_user_id, numero_sst')
      .order('date', { ascending: false });

    if (params.statut) {
      query = query.eq('statut_id', params.statut);
    }
    if (params.agence) {
      query = query.eq('agence_id', params.agence);
    }
    if (params.user) {
      query = query.eq('assigned_user_id', params.user);
    }
    if (params.cursor) {
      query = query.gt('id', params.cursor).limit(params.limit || 50);
    } else {
      query = query.range(params.offset || 0, (params.offset || 0) + (params.limit || 50) - 1);
    }

    const { data } = await query;
    return data || [];
  };

  return await listsCache.getList(cacheKey, fetchFn);
}







