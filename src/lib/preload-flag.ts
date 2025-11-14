/**
 * Flag global pour éviter les préchargements multiples
 * Utilisé pour s'assurer que preloadCriticalData n'est appelé qu'une seule fois après connexion
 */

let hasPreloadedRef = false

export function setHasPreloaded(value: boolean = true) {
  hasPreloadedRef = value
}

export function getHasPreloaded(): boolean {
  return hasPreloadedRef
}

export function resetPreloadFlag() {
  hasPreloadedRef = false
}

