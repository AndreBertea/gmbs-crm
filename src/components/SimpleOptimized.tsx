"use client"

// ===== COMPOSANTS SIMPLIFIÉS ULTRA-OPTIMISÉS =====
// Version qui évite les problèmes de build

import { useSimpleArtisans, useSimpleInterventions } from '@/contexts/SimpleOptimizedContext';
import { memo, useCallback, useMemo } from 'react';

// ===== INTERVENTIONS SIMPLIFIÉES =====
export const SimpleInterventions = memo(() => {
  const { interventions, totalCount, hasMore, loading, error, loadMore } = useSimpleInterventions();

  // Virtualisation simple (20 max pour PC faibles)
  const visibleInterventions = useMemo(() => {
    return interventions.slice(0, Math.min(20, interventions.length));
  }, [interventions]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadMore();
    }
  }, [loading, hasMore, loadMore]);

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        Erreur: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold">
          Interventions ({totalCount})
        </h2>
        <div className="text-sm text-gray-600">
          Affichage: {visibleInterventions.length} / {interventions.length}
        </div>
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {visibleInterventions.map((intervention) => (
          <div key={intervention.id} className="p-3 border rounded-lg hover:bg-gray-50">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{intervention.contexte_intervention}</h3>
                <p className="text-sm text-gray-600">
                  {intervention.adresse} • {intervention.date_prevue}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {intervention.coutIntervention || 0}€
                </div>
                <div className="text-xs text-gray-500">
                  {intervention.statutLabel || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bouton charger plus */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Chargement...' : 'Charger plus'}
          </button>
        </div>
      )}
    </div>
  );
});

SimpleInterventions.displayName = 'SimpleInterventions';

// ===== ARTISANS SIMPLIFIÉS =====
export const SimpleArtisans = memo(() => {
  const { artisans, totalCount, hasMore, loading, error, loadMore } = useSimpleArtisans();

  // Virtualisation simple
  const visibleArtisans = useMemo(() => {
    return artisans.slice(0, Math.min(20, artisans.length));
  }, [artisans]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadMore();
    }
  }, [loading, hasMore, loadMore]);

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        Erreur: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold">
          Artisans ({totalCount})
        </h2>
        <div className="text-sm text-gray-600">
          Affichage: {visibleArtisans.length} / {artisans.length}
        </div>
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {visibleArtisans.map((artisan) => (
          <div key={artisan.id} className="p-3 border rounded-lg hover:bg-gray-50">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{artisan.raison_sociale}</h3>
                <p className="text-sm text-gray-600">
                  {artisan.email} • {artisan.telephone}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {artisan.siret}
                </div>
                <div className="text-xs text-gray-500">
                  {artisan.statutLabel || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bouton charger plus */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Chargement...' : 'Charger plus'}
          </button>
        </div>
      )}
    </div>
  );
});

SimpleArtisans.displayName = 'SimpleArtisans';
