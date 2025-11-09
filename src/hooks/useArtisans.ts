// ===== HOOK PERSONNALISÉ POUR LES ARTISANS =====
// Centralise la logique de chargement des artisans
// Utilise l'API v2 optimisée

import { artisansApiV2, type Artisan } from '@/lib/supabase-api-v2';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';

interface UseArtisansOptions {
  limit?: number;
  offset?: number;
  autoLoad?: boolean;
  filters?: {
    statut?: string;
    metier?: string;
    zone?: string;
    gestionnaire?: string;
  };
}

interface UseArtisansReturn {
  artisans: Artisan[];
  setArtisans: React.Dispatch<React.SetStateAction<Artisan[]>>;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setFilters: (filters: UseArtisansOptions['filters']) => void;
}

export function useArtisans(options: UseArtisansOptions = {}): UseArtisansReturn {
  const {
    limit = 100,
    offset = 0,
    autoLoad = true,
    filters = {}
  } = options;

  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [currentFilters, setCurrentFilters] = useState(filters);

  const loadArtisans = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        limit,
        offset: reset ? 0 : artisans.length,
        ...currentFilters
      };

      const result = await artisansApiV2.getAll(params);
      
      if (reset) {
        setArtisans(result.data);
      } else {
        setArtisans(prev => [...prev, ...result.data]);
      }

      setHasMore(result.pagination.hasMore);
      setTotalCount(result.pagination.total);

    } catch (err) {
      // Améliorer la gestion d'erreur pour mieux diagnostiquer
      let errorMessage = 'Erreur de chargement';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err && typeof err === 'object') {
        // Gérer les erreurs Supabase qui sont des objets
        const supabaseError = err as any;
        if (supabaseError.message) {
          errorMessage = supabaseError.message;
        } else if (supabaseError.error) {
          errorMessage = supabaseError.error;
        } else if (supabaseError.code) {
          errorMessage = `Erreur ${supabaseError.code}: ${JSON.stringify(supabaseError)}`;
        } else {
          errorMessage = JSON.stringify(err);
        }
      }
      
      setError(errorMessage);
      console.error('Erreur lors du chargement des artisans:', {
        error: err,
        message: errorMessage,
        stack: err instanceof Error ? err.stack : undefined
      });
    } finally {
      setLoading(false);
    }
  }, [limit, artisans.length, currentFilters]);

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await loadArtisans(false);
    }
  }, [loading, hasMore, loadArtisans]);

  const refresh = useCallback(async () => {
    await loadArtisans(true);
  }, [loadArtisans]);

  const setFilters = useCallback((newFilters: UseArtisansOptions['filters'] = {}) => {
    setCurrentFilters(newFilters ?? {});
    setArtisans([]);
    setHasMore(true);
  }, []);

  // Chargement automatique
  useEffect(() => {
    if (autoLoad) {
      loadArtisans(true);
    }
  }, [autoLoad, currentFilters]);

  return {
    artisans,
    setArtisans,
    loading,
    error,
    hasMore,
    totalCount,
    loadMore,
    refresh,
    setFilters
  };
}
