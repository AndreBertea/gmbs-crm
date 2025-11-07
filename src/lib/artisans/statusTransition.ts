/**
 * Gestion des transitions de statut d'artisan avec application des règles métier
 * 
 * Inclut la règle ARC-002 :
 * Si statut dossier = INCOMPLET ET statut artisan devient NOVICE → statut dossier passe à "À compléter"
 */

import { calculateDossierStatus, type DossierStatus } from "./dossierStatus"
import { calculateNewArtisanStatus, type ArtisanStatusCode } from "./statusRules"
import type { ArtisanAttachment } from "./dossierStatus"

export interface ArtisanStatusTransitionResult {
  newStatus: ArtisanStatusCode | null
  newDossierStatus: DossierStatus | null
  shouldUpdate: boolean
}

export interface ArtisanStatusTransitionParams {
  currentStatus: ArtisanStatusCode | null
  currentDossierStatus: DossierStatus | null
  attachments: ArtisanAttachment[] | null | undefined
  completedInterventionsCount: number
  hasCompletedIntervention: boolean
}

/**
 * Calcule les nouvelles valeurs de statut d'artisan et de dossier
 * en appliquant toutes les règles métier
 * 
 * @param params - Paramètres de transition
 * @returns Résultat avec les nouveaux statuts à appliquer
 */
export function calculateArtisanStatusTransition(
  params: ArtisanStatusTransitionParams
): ArtisanStatusTransitionResult {
  const {
    currentStatus,
    currentDossierStatus,
    attachments,
    completedInterventionsCount,
    hasCompletedIntervention,
  } = params

  // 1. Calculer le nouveau statut d'artisan basé sur les interventions terminées
  const newArtisanStatus = calculateNewArtisanStatus(
    currentStatus,
    completedInterventionsCount
  )

  // 2. Calculer le statut de dossier actuel basé sur les documents
  const calculatedDossierStatus = calculateDossierStatus(
    attachments,
    hasCompletedIntervention
  )

  // 3. Appliquer la règle ARC-002 :
  // Si statut dossier = INCOMPLET ET statut artisan devient NOVICE → statut dossier passe à "À compléter"
  let finalDossierStatus: DossierStatus | null = null

  if (
    currentDossierStatus === "INCOMPLET" &&
    newArtisanStatus === "NOVICE" &&
    currentStatus !== "NOVICE" // Transition vers NOVICE
  ) {
    finalDossierStatus = "À compléter"
  } else {
    // Sinon, utiliser le statut calculé si différent de l'actuel
    if (calculatedDossierStatus !== currentDossierStatus) {
      finalDossierStatus = calculatedDossierStatus
    }
  }

  // Déterminer si une mise à jour est nécessaire
  const shouldUpdate = 
    newArtisanStatus !== null || 
    finalDossierStatus !== null

  return {
    newStatus: newArtisanStatus,
    newDossierStatus: finalDossierStatus,
    shouldUpdate,
  }
}

/**
 * Vérifie si une intervention terminée doit déclencher une mise à jour de statut
 */
export function shouldUpdateStatusOnInterventionCompletion(
  currentStatus: ArtisanStatusCode | null,
  completedInterventionsCount: number
): boolean {
  const newStatus = calculateNewArtisanStatus(
    currentStatus,
    completedInterventionsCount
  )
  return newStatus !== null
}

