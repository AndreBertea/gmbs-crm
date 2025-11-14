/**
 * Gestionnaire de préchargement des interventions
 * 
 * Ce module gère l'état global du préchargement pour éviter les préchargements
 * concurrents et optimiser les performances.
 */

let activeViewId: string | null = null

/**
 * Définit la vue active pour le préchargement
 */
export function setActiveViewId(viewId: string | null): void {
  activeViewId = viewId
}

/**
 * Vérifie si on peut précharger la page suivante
 * 
 * @param viewId - L'ID de la vue actuelle
 * @returns true si on peut précharger la page suivante
 */
export function canPreloadNextPage(viewId: string | null): boolean {
  // On peut précharger si la vue actuelle est active
  return activeViewId === viewId
}

