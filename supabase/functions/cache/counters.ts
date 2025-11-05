// Cache des compteurs totaux pour optimiser les performances
// Utilise un cache en mémoire avec expiration

interface CacheEntry {
  value: number;
  timestamp: number;
  expiresAt: number;
}

class CountersCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  get(key: string): number | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  set(key: string, value: number): void {
    const now = Date.now();
    this.cache.set(key, {
      value,
      timestamp: now,
      expiresAt: now + this.TTL
    });
  }

  clear(): void {
    this.cache.clear();
  }

  // Méthode pour obtenir un compteur avec cache
  async getCount(supabase: any, table: string, filter?: string): Promise<number> {
    const cacheKey = `${table}_count${filter ? `_${filter}` : ''}`;
    
    // Vérifier le cache
    const cached = this.get(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    // Requête à la base de données
    let query = supabase.from(table).select('*', { count: 'exact', head: true });
    
    // Appliquer le filtre si fourni
    if (filter) {
      // Exemple: filter = "statut_inactif=false"
      const [column, value] = filter.split('=');
      query = query.eq(column, value);
    }
    
    const { count } = await query;
    const result = count || 0;
    
    // Mettre en cache
    this.set(cacheKey, result);
    
    return result;
  }
}

// Instance globale du cache
export const countersCache = new CountersCache();

// Fonction utilitaire pour obtenir le compteur d'artisans
export async function getArtisansCount(supabase: any, activeOnly: boolean = true): Promise<number> {
  const filter = activeOnly ? 'statut_inactif=false' : undefined;
  return await countersCache.getCount(supabase, 'artisans', filter);
}

// Fonction utilitaire pour obtenir le compteur d'interventions
export async function getInterventionsCount(supabase: any): Promise<number> {
  return await countersCache.getCount(supabase, 'interventions');
}








