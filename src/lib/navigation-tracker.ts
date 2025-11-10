// Module singleton pour tracker la navigation entre les pages
// Permet de détecter les changements de route même quand les composants sont démontés

let lastPathname: string | null = null

const ROUTE_CHANGED_EVENT = "route-changed"

type RouteChangedEventDetail = {
  pathname: string
  previousPathname: string | null
}

/**
 * Définit le pathname actuel et émet un événement si il a changé
 */
export function setPathname(pathname: string): void {
  if (typeof window === "undefined") {
    lastPathname = pathname
    return
  }

  const previousPathname = lastPathname
  lastPathname = pathname

  // Émettre l'événement uniquement si le pathname a réellement changé
  if (previousPathname !== pathname) {
    window.dispatchEvent(
      new CustomEvent<RouteChangedEventDetail>(ROUTE_CHANGED_EVENT, {
        detail: {
          pathname,
          previousPathname,
        },
      }),
    )
  }
}

/**
 * Récupère le dernier pathname enregistré
 */
export function getLastPathname(): string | null {
  return lastPathname
}

/**
 * Écoute les changements de route
 * @param callback Fonction appelée avec le nouveau pathname et l'ancien pathname
 * @returns Fonction pour désabonner l'écouteur
 */
export function onRouteChanged(
  callback: (detail: RouteChangedEventDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {}
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<RouteChangedEventDetail>
    callback(customEvent.detail)
  }

  window.addEventListener(ROUTE_CHANGED_EVENT, handler)
  return () => {
    window.removeEventListener(ROUTE_CHANGED_EVENT, handler)
  }
}

