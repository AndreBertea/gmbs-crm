// ===== HOOK PERSONNALISÉ POUR LES INTERVENTIONS =====
// Centralise la logique de chargement des interventions
// Utilise l'API v2 optimisée

import { SCROLL_CONFIG } from '@/config/interventions';
import { interventionsApiV2, type CursorDirection, type InterventionCursor } from '@/lib/supabase-api-v2';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { InterventionView } from '@/types/intervention-view';

interface UseInterventionsOptions {
  limit?: number;
  initialCursor?: InterventionCursor | null;
  initialDirection?: CursorDirection;
  autoLoad?: boolean;
  maxCachedItems?: number;
  viewId?: string;  // ✅ ID de la vue active pour forcer reload au changement
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
  loadMore: (direction?: CursorDirection) => Promise<void>;
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
  currentCursor: InterventionCursor | null;
  direction: CursorDirection;
}

export function useInterventions(options: UseInterventionsOptions = {}): UseInterventionsReturn {
  const {
    limit = SCROLL_CONFIG.BATCH_SIZE,
    initialCursor = null,
    initialDirection = "forward",
    autoLoad = true,
    viewId,  // ✅ ID de la vue active
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
    viewId?: string;
    filters: UseInterventionsOptions["filters"];
    sortBy?: string;
    sortDir?: "asc" | "desc";
    search?: string;
    fields?: string[];
  }>({
    viewId,
    filters,
    sortBy,
    sortDir,
    search,
    fields,
  });
  const [currentCursor, setCurrentCursor] = useState<InterventionCursor | null>(initialCursor);
  const [direction, setDirection] = useState<CursorDirection>(initialDirection);
  const cursorRef = useRef<InterventionCursor | null>(initialCursor);
  const prevCursorRef = useRef<InterventionCursor | null>(null);
  const initialLoadRef = useRef(true);

  // ✅ Inclure viewId dans paramsKey pour forcer reload au changement de vue
  const paramsKey = JSON.stringify(query);
  const resetPagingState = useCallback(() => {
    cursorRef.current = initialCursor ?? null;
    prevCursorRef.current = null;
    initialLoadRef.current = true;
    setCurrentCursor(initialCursor ?? null);
    setDirection(initialDirection ?? "forward");
    setHasMore(true);
  }, [initialCursor, initialDirection]);

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

  const loadInterventions = useCallback(
    async (
      {
        reset = false,
        direction: directionOverride,
        skipCache = false,
      }: { reset?: boolean; direction?: CursorDirection; skipCache?: boolean } = {},
    ): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const storage =
          typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
            ? window.sessionStorage
            : null;

        const targetDirection: CursorDirection = reset ? "forward" : directionOverride ?? direction ?? "forward";
        const cursorToUse = reset
          ? initialCursor ?? null
          : targetDirection === "backward"
            ? prevCursorRef.current
            : cursorRef.current;

        if (!reset && targetDirection === "forward" && (!cursorToUse || !hasMore)) {
          setHasMore(false);
          setLoading(false);
          return false;
        }

        if (!reset && targetDirection === "backward" && !cursorToUse) {
          setLoading(false);
          return false;
        }

        if (targetDirection !== direction) {
          setDirection(targetDirection);
        }

        const initialLimit = initialLoadRef.current
          ? Math.min(limit, SCROLL_CONFIG.INITIAL_BATCH_SIZE)
          : limit;
        const effectiveLimit = Math.max(1, Math.min(initialLimit, 200));

        const requestParams = {
          limit: effectiveLimit,
          cursor: cursorToUse ?? undefined,
          direction: targetDirection,
          statut: query.filters?.statut,
          agence: query.filters?.agence,
          artisan: query.filters?.artisan,
          metier: query.filters?.metier,
          user: query.filters?.user,
          startDate: query.filters?.startDate,
          endDate: query.filters?.endDate,
          search: query.search,
          fields: query.fields,
        } as const;

        const cursorKey = cursorToUse
          ? `${cursorToUse.date}|${cursorToUse.id}|${targetDirection}`
          : `root-${targetDirection}`;
        const cacheKey = `interventions-${paramsKey}-${cursorKey}`;

        const mergeAndTrim = (
          incoming: InterventionView[],
          pagination: {
            hasMore: boolean;
            hasPrev?: boolean;
            total?: number;
            cursorNext?: InterventionCursor | null;
            cursorPrev?: InterventionCursor | null;
            direction?: CursorDirection;
          },
        ) => {
          const directionUsed = pagination.direction ?? targetDirection;
          const dedupedIncoming = Array.from(new Map(incoming.map((item) => [item.id, item])).values());
          const maxItems = Math.max(1, maxCachedItems);

          setInterventions((prev) => {
            if (reset) {
              return dedupedIncoming;
            }

            const combined =
              directionUsed === "backward"
                ? [...dedupedIncoming, ...prev]
                : [...prev, ...dedupedIncoming];

            const seen = new Set<string>();
            const unique: InterventionView[] = [];
            for (const item of combined) {
              if (!item?.id || seen.has(item.id)) continue;
              seen.add(item.id);
              unique.push(item);
            }

            if (!slidingWindow || unique.length <= maxItems) {
              return unique;
            }

            const overflow = unique.length - maxItems;
            if (overflow <= 0) {
              return unique;
            }

            if (directionUsed === "backward") {
              return unique.slice(0, unique.length - overflow);
            }

            return unique.slice(overflow);
          });

          setHasMore(Boolean(pagination.hasMore));
          setTotalCount(
            typeof pagination.total === "number"
              ? pagination.total
              : dedupedIncoming.length,
          );
          cursorRef.current = pagination.cursorNext ?? null;
          prevCursorRef.current = pagination.cursorPrev ?? null;
          setCurrentCursor(pagination.cursorPrev ?? cursorToUse ?? null);
          setDirection(directionUsed);
        };

        // Ignorer le cache si skipCache est true (au premier mount par exemple)
        if (storage && !skipCache) {
          try {
            const cachedData = storage.getItem(cacheKey);
            if (cachedData) {
              const parsed = JSON.parse(cachedData);
              const isExpired = Date.now() - (parsed.timestamp ?? 0) >= SCROLL_CONFIG.CACHE_TTL_MS;
              const hasMoreFalse = parsed.pagination?.hasMore === false;
              
              // ⚠️ IMPORTANT : Ne JAMAIS utiliser un cache avec hasMore: false
              // Cela bloque le scroll infini quand on revient sur la page
              if (hasMoreFalse) {
                storage.removeItem(cacheKey);
              } else if (!isExpired) {
                mergeAndTrim(parsed.data ?? [], parsed.pagination ?? { hasMore: false });
                setLoading(false);
                initialLoadRef.current = false;
                return true;
              }
            }
          } catch (cacheError) {
            console.warn("Cache invalide, rechargement depuis l'API", cacheError);
          }
        }

        const result = await interventionsApiV2.getAll(requestParams);

        mergeAndTrim(result.data, result.pagination ?? { hasMore: false });

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
        const message = err instanceof Error ? err.message : "Erreur de chargement";
        setError(message);
        if (message.includes("416")) {
          setHasMore(false);
        }
        console.error("Erreur lors du chargement des interventions:", err);
      } finally {
        initialLoadRef.current = false;
        setLoading(false);
      }
      return false;
    },
    [
      cleanupCache,
      direction,
      hasMore,
      initialCursor,
      limit,
      maxCachedItems,
      paramsKey,
      query,
      slidingWindow,
    ],
  );

  useEffect(() => {
    interventionsRef.current = interventions;
  }, [interventions]);

  const loadMore = useCallback(
    async (nextDirection: CursorDirection = "forward") => {
      if (loading) {
        return;
      }

      if (nextDirection === "forward") {
        if (!hasMore) {
          return;
        }
      } else if (!prevCursorRef.current) {
        return;
      }

      await loadInterventions({ reset: false, direction: nextDirection });
    },
    [loading, hasMore, loadInterventions],
  );

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
    await loadInterventions({ reset: true, direction: "forward" });
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
      void loadInterventionsRef.current({
        reset: true,
        direction: "forward",
        skipCache: true,
      });
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
    currentCursor,
    direction,
  };
}
