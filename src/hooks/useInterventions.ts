// ===== HOOK PERSONNALISÉ POUR LES INTERVENTIONS =====
// Centralise la logique de chargement des interventions
// Utilise l'API v2 optimisée

import { SCROLL_CONFIG } from '@/config/interventions';
import { interventionsApiV2 } from '@/lib/supabase-api-v2';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { InterventionView } from '@/types/intervention-view';

interface UseInterventionsOptions {
  limit?: number;
  offset?: number;
  autoLoad?: boolean;
  maxCachedItems?: number;
  filters?: {
    statut?: string | string[];
    agence?: string | string[];
    artisan?: string | string[];
    metier?: string | string[];
    user?: string | string[];
    startDate?: string;
    endDate?: string;
  };
  sortBy?: string;
  sortDir?: "asc" | "desc";
  search?: string;
  fields?: string[];
  slidingWindow?: boolean;
}

interface UseInterventionsReturn {
  interventions: InterventionView[];
  setInterventions: React.Dispatch<React.SetStateAction<InterventionView[]>>;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  updateInterventionOptimistic: (id: string, updates: Partial<InterventionView>) => void;
  setFilters: (filters: UseInterventionsOptions['filters']) => void;
  setSort: (sortBy?: string, sortDir?: "asc" | "desc") => void;
  setSearch: (search?: string) => void;
  setFields: (fields?: string[]) => void;
  setQuery: (options: {
    filters?: UseInterventionsOptions["filters"];
    sortBy?: string;
    sortDir?: "asc" | "desc";
    search?: string;
    fields?: string[];
  }) => void;
  currentOffset: number;
  direction: "forward" | "backward";
}

export function useInterventions(options: UseInterventionsOptions = {}): UseInterventionsReturn {
  const {
    limit = SCROLL_CONFIG.BATCH_SIZE,
    offset = 0,
    autoLoad = true,
    filters = {},
    sortBy,
    sortDir = "desc",
    search,
    fields,
    maxCachedItems = SCROLL_CONFIG.MAX_CACHED_ITEMS,
    slidingWindow = SCROLL_CONFIG.SLIDING_WINDOW_ENABLED,
  } = options;

  const [interventions, setInterventions] = useState<InterventionView[]>([]);
  const interventionsRef = useRef<InterventionView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [query, setQueryState] = useState<{
    filters: UseInterventionsOptions["filters"];
    sortBy?: string;
    sortDir?: "asc" | "desc";
    search?: string;
    fields?: string[];
  }>({
    filters,
    sortBy,
    sortDir,
    search,
    fields,
  });
  const [currentOffset, setCurrentOffset] = useState(offset);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const windowStartRef = useRef(offset);
  const nextOffsetRef = useRef(offset);
  const initialLoadRef = useRef(true);

  const paramsKey = JSON.stringify(query);
  const resetPagingState = useCallback(() => {
    windowStartRef.current = offset;
    nextOffsetRef.current = offset;
    initialLoadRef.current = true;
    setCurrentOffset(offset);
    setDirection("forward");
  }, [offset]);

  // Fonction pour nettoyer les anciennes entrées de cache
  const cleanupCache = useCallback(() => {
    if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
      return;
    }
    const storage = window.sessionStorage;

    try {
      const CACHE_PREFIX = 'interventions-';
      const MAX_CACHE_ENTRIES = SCROLL_CONFIG.MAX_CACHE_ENTRIES;
      const CACHE_DURATION = SCROLL_CONFIG.CACHE_TTL_MS;

      const cacheKeys: Array<{ key: string; timestamp: number }> = [];

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          try {
            const item = storage.getItem(key);
            if (item) {
              const parsed = JSON.parse(item);
              cacheKeys.push({ key, timestamp: parsed.timestamp || 0 });
            }
          } catch {
            storage.removeItem(key);
          }
        }
      }

      cacheKeys.sort((a, b) => a.timestamp - b.timestamp);

      const now = Date.now();
      for (const { key, timestamp } of cacheKeys) {
        if (now - timestamp > CACHE_DURATION) {
          storage.removeItem(key);
        }
      }

      if (cacheKeys.length > MAX_CACHE_ENTRIES) {
        const toRemove = cacheKeys.slice(0, cacheKeys.length - MAX_CACHE_ENTRIES);
        for (const { key } of toRemove) {
          storage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('Erreur lors du nettoyage du cache, vidage complet:', error);
      try {
        for (let i = window.sessionStorage.length - 1; i >= 0; i--) {
          const key = window.sessionStorage.key(i);
          if (key && key.startsWith('interventions-')) {
            window.sessionStorage.removeItem(key);
          }
        }
      } catch {
        // Impossible de nettoyer proprement, on ignore
      }
    }
  }, []);

  const loadInterventions = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const storage =
        typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
          ? window.sessionStorage
          : null;

      const fetchOffset = reset ? offset : nextOffsetRef.current;
      const nextDirection =
        fetchOffset < currentOffset ? "backward" : fetchOffset > currentOffset ? "forward" : direction;

      if (nextDirection !== direction) {
        setDirection(nextDirection);
      }
      setCurrentOffset(fetchOffset);

      const initialLimit = initialLoadRef.current
        ? Math.min(limit, SCROLL_CONFIG.INITIAL_BATCH_SIZE)
        : limit;
      const effectiveLimit = Math.max(1, Math.min(initialLimit, 200));

      const params = {
        limit: effectiveLimit,
        offset: fetchOffset,
        statut: query.filters?.statut,
        agence: query.filters?.agence,
        artisan: query.filters?.artisan,
        metier: query.filters?.metier,
        user: query.filters?.user,
        startDate: query.filters?.startDate,
        endDate: query.filters?.endDate,
        sortBy: query.sortBy,
        sortDir: query.sortDir,
        search: query.search,
        fields: query.fields,
      };

      const cacheKey = `interventions-${JSON.stringify(params)}`;

      const mergeAndTrim = (
        incoming: InterventionView[],
        pagination: { hasMore: boolean; total: number; offset: number },
      ) => {
        const baseOffset = pagination.offset ?? fetchOffset;
        const dedupedIncoming = Array.from(new Map(incoming.map((item) => [item.id, item])).values());

        if (reset) {
          windowStartRef.current = baseOffset;
          nextOffsetRef.current = baseOffset + incoming.length;
          setInterventions(dedupedIncoming);
        } else {
          if (nextDirection === "backward") {
            windowStartRef.current = Math.min(windowStartRef.current, baseOffset);
          }
          setInterventions((prev) => {
            const combined = [...prev, ...dedupedIncoming];
            const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());

            if (!slidingWindow || unique.length <= maxCachedItems) {
              return unique;
            }

            if (nextDirection === "backward") {
              const overflow = unique.length - maxCachedItems;
              if (overflow <= 0) {
                return unique;
              }
              return unique.slice(0, unique.length - overflow);
            }

            if (unique.length > maxCachedItems * 1.5) {
              const trimmed = unique.slice(-maxCachedItems);
              windowStartRef.current += unique.length - maxCachedItems;
              return trimmed;
            }

            const overflow = unique.length - maxCachedItems;
            if (overflow > 0) {
              windowStartRef.current += overflow;
              return unique.slice(overflow);
            }
            return unique;
          });
          nextOffsetRef.current = baseOffset + incoming.length;
        }

        setHasMore(pagination.hasMore);
        setTotalCount(pagination.total);
      };

      if (storage) {
        try {
          const cachedData = storage.getItem(cacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            if (Date.now() - (parsed.timestamp ?? 0) < SCROLL_CONFIG.CACHE_TTL_MS) {
              mergeAndTrim(parsed.data ?? [], {
                hasMore: parsed.pagination?.hasMore ?? false,
                total: parsed.pagination?.total ?? parsed.data?.length ?? 0,
                offset: parsed.pagination?.offset ?? fetchOffset,
              });
              setLoading(false);
              initialLoadRef.current = false;
              return;
            }
          }
        } catch (cacheError) {
          console.warn("Cache invalide, rechargement depuis l'API", cacheError);
        }
      }

      const result = await interventionsApiV2.getAll(params);

      mergeAndTrim(result.data, result.pagination);

      cleanupCache();

      if (storage) {
        try {
          storage.setItem(
            cacheKey,
            JSON.stringify({
              data: result.data,
              pagination: result.pagination,
              timestamp: Date.now(),
            }),
          );
        } catch (storageError: any) {
          if (storageError?.name === "QuotaExceededError" || storageError?.code === 22) {
            console.warn("Quota sessionStorage dépassé, nettoyage du cache...");
            for (let i = storage.length - 1; i >= 0; i--) {
              const key = storage.key(i);
              if (key && key.startsWith("interventions-")) {
                storage.removeItem(key);
              }
            }
            try {
              storage.setItem(
                cacheKey,
                JSON.stringify({
                  data: result.data,
                  pagination: result.pagination,
                  timestamp: Date.now(),
                }),
              );
            } catch (retryError) {
              console.warn("Impossible de mettre en cache, cache désactivé", retryError);
            }
          }
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
      console.error("Erreur lors du chargement des interventions:", err);
    } finally {
      initialLoadRef.current = false;
      setLoading(false);
    }
  }, [offset, limit, query, maxCachedItems, cleanupCache, slidingWindow, currentOffset, direction]);

  useEffect(() => {
    interventionsRef.current = interventions;
  }, [interventions]);

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await loadInterventions(false);
    }
  }, [loading, hasMore, loadInterventions]);

  const refresh = useCallback(async () => {
    // Vider le cache sessionStorage pour forcer un rechargement complet depuis l'API
    if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
      try {
        const storage = window.sessionStorage;
        const cachePrefix = 'interventions-';
        const keysToRemove: string[] = [];
        
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith(cachePrefix)) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => storage.removeItem(key));
        console.log(`🔄 Cache invalidé : ${keysToRemove.length} entrées supprimées`);
      } catch (error) {
        console.warn('Erreur lors de la vidange du cache:', error);
      }
    }
    
    resetPagingState();
    await loadInterventions(true);
  }, [loadInterventions, resetPagingState]);

  // Mise à jour optimiste d'une intervention dans la liste locale
  const updateInterventionOptimistic = useCallback((id: string, updates: Partial<InterventionView>) => {
    setInterventions((prev) => {
      const index = prev.findIndex(item => item.id === id);
      if (index === -1) return prev;
      
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      console.log(`⚡ Mise à jour optimiste de l'intervention ${id}`);
      return updated;
    });
  }, []);

  const setFilters = useCallback((newFilters: UseInterventionsOptions['filters'] = {}) => {
    resetPagingState();
    setQueryState((prev) => ({
      ...prev,
      filters: newFilters ?? {},
    }));
    setInterventions([]);
    setHasMore(true);
  }, [resetPagingState]);

  const setSort = useCallback((nextSortBy?: string, nextSortDir: "asc" | "desc" = "desc") => {
    resetPagingState();
    setQueryState((prev) => ({
      ...prev,
      sortBy: nextSortBy,
      sortDir: nextSortDir,
    }));
    setInterventions([]);
    setHasMore(true);
  }, [resetPagingState]);

  const setSearch = useCallback((nextSearch?: string) => {
    resetPagingState();
    setQueryState((prev) => ({
      ...prev,
      search: nextSearch,
    }));
    setInterventions([]);
    setHasMore(true);
  }, [resetPagingState]);

  const setFields = useCallback((nextFields?: string[]) => {
    resetPagingState();
    setQueryState((prev) => ({
      ...prev,
      fields: nextFields,
    }));
    setInterventions([]);
    setHasMore(true);
  }, [resetPagingState]);

  const setQuery = useCallback(
    (options: {
      filters?: UseInterventionsOptions["filters"];
      sortBy?: string;
      sortDir?: "asc" | "desc";
      search?: string;
      fields?: string[];
    }) => {
      resetPagingState();
      setQueryState((prev) => ({
        filters: options.filters ?? prev.filters ?? {},
        sortBy: options.sortBy ?? prev.sortBy,
        sortDir: options.sortDir ?? prev.sortDir,
        search: options.search ?? prev.search,
        fields: options.fields ?? prev.fields,
      }));
      setInterventions([]);
      setHasMore(true);
    },
    [resetPagingState],
  );

  const loadInterventionsRef = useRef(loadInterventions);
  useEffect(() => {
    loadInterventionsRef.current = loadInterventions;
  }, [loadInterventions]);

  // Chargement automatique
  useEffect(() => {
    if (autoLoad) {
      resetPagingState();
      loadInterventionsRef.current(true);
    }
  }, [autoLoad, paramsKey, resetPagingState]);

  return {
    interventions,
    setInterventions,
    loading,
    error,
    hasMore,
    totalCount,
    loadMore,
    refresh,
    updateInterventionOptimistic,
    setFilters,
    setSort,
    setSearch,
    setFields,
    setQuery,
    currentOffset,
    direction,
  };
}
