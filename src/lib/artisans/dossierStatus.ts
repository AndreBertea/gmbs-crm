/**
 * Utilitaires pour calculer le statut de dossier d'un artisan
 * 
 * Statuts possibles :
 * - INCOMPLET : Toutes les 5 entrées documents ne sont pas complètes
 * - À compléter : Si l'artisan a effectué une intervention ET dossier incomplet OU manque 1 fichier
 * - COMPLET : Les 5 documents requis sont présents
 * 
 * Documents requis (5) :
 * - kbis (Extrait Kbis)
 * - assurance (Attestation d'assurance)
 * - cni_recto_verso (CNI recto/verso)
 * - iban (IBAN)
 * - decharge_partenariat (Décharge partenariat)
 * 
 * Note : "autre" n'est pas nécessaire pour que le dossier soit complet
 */

export type DossierStatus = "INCOMPLET" | "À compléter" | "COMPLET"

export type ArtisanDocumentKind = 
  | "kbis"
  | "assurance"
  | "cni_recto_verso"
  | "iban"
  | "decharge_partenariat"
  | "photo_profil"
  | "autre"
  | "a_classe"

/**
 * Documents requis pour un dossier complet
 */
export const REQUIRED_DOCUMENT_KINDS: ArtisanDocumentKind[] = [
  "kbis",
  "assurance",
  "cni_recto_verso",
  "iban",
  "decharge_partenariat",
]

export interface ArtisanAttachment {
  id: string
  artisan_id: string
  kind: string
  url: string
  filename?: string | null
  mime_type?: string | null
  file_size?: number | null
  created_at?: string | null
}

/**
 * Calcule le statut de dossier d'un artisan basé sur ses documents
 * 
 * @param attachments - Liste des documents de l'artisan
 * @param hasCompletedIntervention - Si l'artisan a effectué au moins une intervention terminée
 * @returns Le statut de dossier calculé
 */
export function calculateDossierStatus(
  attachments: ArtisanAttachment[] | null | undefined,
  hasCompletedIntervention: boolean = false
): DossierStatus {
  if (!attachments || attachments.length === 0) {
    // Si pas de documents et a effectué une intervention → À compléter
    // Sinon → INCOMPLET
    return hasCompletedIntervention ? "À compléter" : "INCOMPLET"
  }

  // Créer un Set des kinds présents (normaliser en lowercase pour comparaison)
  const presentKinds = new Set(
    attachments
      .map(att => att.kind?.toLowerCase().trim())
      .filter(Boolean)
  )

  // Vérifier quels documents requis sont présents
  const requiredKindsLower = REQUIRED_DOCUMENT_KINDS.map(k => k.toLowerCase())
  const missingDocuments = requiredKindsLower.filter(
    kind => !presentKinds.has(kind)
  )

  // Si tous les documents requis sont présents → COMPLET
  if (missingDocuments.length === 0) {
    return "COMPLET"
  }

  // Si manque 1 seul document OU artisan a effectué une intervention → À compléter
  if (missingDocuments.length === 1 || hasCompletedIntervention) {
    return "À compléter"
  }

  // Sinon → INCOMPLET
  return "INCOMPLET"
}

/**
 * Vérifie si un document spécifique est présent
 */
export function hasDocument(
  attachments: ArtisanAttachment[] | null | undefined,
  kind: ArtisanDocumentKind
): boolean {
  if (!attachments || attachments.length === 0) {
    return false
  }

  const kindLower = kind.toLowerCase()
  return attachments.some(
    att => att.kind?.toLowerCase().trim() === kindLower
  )
}

/**
 * Compte le nombre de documents requis présents
 */
export function countRequiredDocuments(
  attachments: ArtisanAttachment[] | null | undefined
): number {
  if (!attachments || attachments.length === 0) {
    return 0
  }

  const presentKinds = new Set(
    attachments
      .map(att => att.kind?.toLowerCase().trim())
      .filter(Boolean)
  )

  return REQUIRED_DOCUMENT_KINDS.filter(
    kind => presentKinds.has(kind.toLowerCase())
  ).length
}

