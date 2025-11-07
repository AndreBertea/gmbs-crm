/**
 * Règles de transition automatiques pour les statuts d'artisans
 * 
 * Règles principales :
 * - candidat → novice : 1 intervention terminée
 * - novice → formation : 3 interventions terminées
 * - formation → confirmé : 6 interventions terminées
 * - confirmé → expert : 10+ interventions terminées
 * - potentiel → novice : Première intervention terminée
 * 
 * Statuts non-automatiques (attribution manuelle uniquement) :
 * - candidat → oneshot : Attribution manuelle
 * - candidat → potentiel : Évaluation positive (manuelle)
 * - Tous → archiver : Archivage avec raison requise
 */

export type ArtisanStatusCode = 
  | "CANDIDAT"
  | "NOVICE"
  | "FORMATION"
  | "CONFIRME"
  | "EXPERT"
  | "POTENTIEL"
  | "ONE_SHOT"
  | "ARCHIVE"

/**
 * Seuils d'interventions terminées pour chaque statut
 */
export const STATUS_THRESHOLDS: Record<ArtisanStatusCode, number> = {
  CANDIDAT: 0,
  NOVICE: 1,
  FORMATION: 3,
  CONFIRME: 6,
  EXPERT: 10,
  POTENTIEL: 0, // Pas de seuil, transition manuelle
  ONE_SHOT: 0, // Pas de seuil, attribution manuelle
  ARCHIVE: -1, // Statut terminal, pas de seuil
}

/**
 * Statuts qui peuvent être attribués automatiquement
 */
export const AUTO_ASSIGNABLE_STATUSES = new Set<ArtisanStatusCode>([
  "NOVICE",
  "FORMATION",
  "CONFIRME",
  "EXPERT",
])

/**
 * Statuts qui nécessitent une attribution manuelle
 */
export const MANUAL_ONLY_STATUSES = new Set<ArtisanStatusCode>([
  "POTENTIEL",
  "ONE_SHOT",
  "ARCHIVE",
])

/**
 * Calcule le nouveau statut d'artisan basé sur le nombre d'interventions terminées
 * 
 * @param currentStatus - Statut actuel de l'artisan
 * @param completedInterventionsCount - Nombre d'interventions terminées
 * @returns Le nouveau statut ou null si pas de changement
 */
export function calculateNewArtisanStatus(
  currentStatus: ArtisanStatusCode | null | undefined,
  completedInterventionsCount: number
): ArtisanStatusCode | null {
  if (!currentStatus) {
    // Si pas de statut, retourner CANDIDAT par défaut
    return "CANDIDAT"
  }

  // Si statut terminal ou manuel uniquement, pas de changement automatique
  if (MANUAL_ONLY_STATUSES.has(currentStatus) || currentStatus === "ARCHIVE") {
    return null
  }

  // Calculer le statut approprié selon le nombre d'interventions
  let newStatus: ArtisanStatusCode | null = null

  if (completedInterventionsCount >= STATUS_THRESHOLDS.EXPERT) {
    newStatus = "EXPERT"
  } else if (completedInterventionsCount >= STATUS_THRESHOLDS.CONFIRME) {
    newStatus = "CONFIRME"
  } else if (completedInterventionsCount >= STATUS_THRESHOLDS.FORMATION) {
    newStatus = "FORMATION"
  } else if (completedInterventionsCount >= STATUS_THRESHOLDS.NOVICE) {
    newStatus = "NOVICE"
  } else {
    // Moins de 1 intervention → reste CANDIDAT ou POTENTIEL
    newStatus = currentStatus === "POTENTIEL" ? "POTENTIEL" : "CANDIDAT"
  }

  // Retourner le nouveau statut seulement s'il est différent de l'actuel
  return newStatus !== currentStatus ? newStatus : null
}

/**
 * Vérifie si une transition de statut est autorisée
 * 
 * @param fromStatus - Statut actuel
 * @param toStatus - Statut cible
 * @returns true si la transition est autorisée
 */
export function isTransitionAllowed(
  fromStatus: ArtisanStatusCode | null | undefined,
  toStatus: ArtisanStatusCode
): boolean {
  if (!fromStatus) {
    // À la création, seuls CANDIDAT et POTENTIEL sont autorisés
    return toStatus === "CANDIDAT" || toStatus === "POTENTIEL"
  }

  // ARCHIVE peut être atteint depuis n'importe quel statut (avec raison)
  if (toStatus === "ARCHIVE") {
    return true
  }

  // ONE_SHOT peut être atteint uniquement depuis CANDIDAT
  if (toStatus === "ONE_SHOT") {
    return fromStatus === "CANDIDAT"
  }

  // POTENTIEL peut être atteint uniquement depuis CANDIDAT
  if (toStatus === "POTENTIEL") {
    return fromStatus === "CANDIDAT"
  }

  // Les autres transitions sont gérées automatiquement par calculateNewArtisanStatus
  // mais on peut permettre les transitions manuelles vers les statuts auto-assignables
  if (AUTO_ASSIGNABLE_STATUSES.has(toStatus)) {
    return true
  }

  return false
}

/**
 * Obtient le statut par défaut pour un nouvel artisan
 */
export function getDefaultArtisanStatus(): ArtisanStatusCode {
  return "CANDIDAT"
}

