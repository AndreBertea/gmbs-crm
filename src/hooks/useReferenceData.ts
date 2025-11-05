// ===== HOOK POUR LES DONNÉES DE RÉFÉRENCE =====
// Cache les données de référence pour éviter les requêtes répétées

import { referenceApi, type ReferenceData } from '@/lib/reference-api';
import { useCallback, useEffect, useState } from 'react';

interface UseReferenceDataReturn {
  data: ReferenceData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getInterventionStatusLabel: (id: string) => string;
  getAgencyLabel: (id: string) => string;
  getUserCode: (id: string) => string;
}

// Cache global pour éviter les requêtes répétées
let cachedData: ReferenceData | null = null;
let lastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useReferenceData(): UseReferenceDataReturn {
  const [data, setData] = useState<ReferenceData | null>(cachedData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    // Utiliser le cache si disponible et récent
    if (cachedData && Date.now() - lastFetch < CACHE_DURATION) {
      setData(cachedData);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await referenceApi.getAll();
      
      // Mettre en cache
      cachedData = result;
      lastFetch = Date.now();
      setData(result);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      console.error('Erreur lors du chargement des données de référence:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    cachedData = null; // Invalider le cache
    await loadData();
  }, [loadData]);

  // Chargement automatique
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fonctions utilitaires
  const getInterventionStatusLabel = useCallback((id: string): string => {
    if (!data) return id;
    const status = data.interventionStatuses.find(s => s.id === id);
    return status?.label || id;
  }, [data]);

  const getAgencyLabel = useCallback((id: string): string => {
    if (!data) return id;
    const agency = data.agencies.find(a => a.id === id);
    return agency?.label || id;
  }, [data]);

  const getUserCode = useCallback((id: string): string => {
    if (!data) return id;
    const user = data.users.find(u => u.id === id);
    return user?.code_gestionnaire || id;
  }, [data]);

  return {
    data,
    loading,
    error,
    refresh,
    getInterventionStatusLabel,
    getAgencyLabel,
    getUserCode
  };
}
