-- ============================================
-- Nettoyage des statuts d'intervention dupliqués
-- ============================================
-- Ce script identifie les statuts non canoniques générés par les imports
-- historiques, remappe les interventions vers les codes officiels puis
-- supprime les entrées inutilisées.
-- ============================================
-- Date: 2025-10-24
-- Author: Codex (IA)
-- ============================================

-- 1. Lister les statuts non canoniques encore présents
SELECT
  code,
  label,
  (SELECT COUNT(*) FROM interventions WHERE statut_id = intervention_statuses.id) AS usage_count
FROM intervention_statuses
WHERE code NOT IN (
  'DEMANDE',
  'DEVIS_ENVOYE',
  'VISITE_TECHNIQUE',
  'ACCEPTE',
  'INTER_EN_COURS',
  'INTER_TERMINEE',
  'SAV',
  'STAND_BY',
  'REFUSE',
  'ANNULE',
  'ATT_ACOMPTE',
  '19082024'
)
ORDER BY usage_count DESC;

-- 2. Exemple de remapping: adapter selon les codes rencontrés
--    Chaque bloc met à jour les interventions vers le code canonique.

-- ENCOURS → INTER_EN_COURS
UPDATE interventions
SET statut_id = (
  SELECT id FROM intervention_statuses WHERE code = 'INTER_EN_COURS'
)
WHERE statut_id = (
  SELECT id FROM intervention_statuses WHERE code = 'ENCOURS'
);

-- INTERENCOU → INTER_EN_COURS
UPDATE interventions
SET statut_id = (
  SELECT id FROM intervention_statuses WHERE code = 'INTER_EN_COURS'
)
WHERE statut_id = (
  SELECT id FROM intervention_statuses WHERE code = 'INTERENCOU'
);

-- TERMINEE → INTER_TERMINEE
UPDATE interventions
SET statut_id = (
  SELECT id FROM intervention_statuses WHERE code = 'INTER_TERMINEE'
)
WHERE statut_id = (
  SELECT id FROM intervention_statuses WHERE code = 'TERMINEE'
);

-- INTERTERMINEE → INTER_TERMINEE
UPDATE interventions
SET statut_id = (
  SELECT id FROM intervention_statuses WHERE code = 'INTER_TERMINEE'
)
WHERE statut_id = (
  SELECT id FROM intervention_statuses WHERE code = 'INTERTERMINEE'
);

-- 3. Supprimer les statuts inutilisés après remapping
DELETE FROM intervention_statuses
WHERE code NOT IN (
  'DEMANDE',
  'DEVIS_ENVOYE',
  'VISITE_TECHNIQUE',
  'ACCEPTE',
  'INTER_EN_COURS',
  'INTER_TERMINEE',
  'SAV',
  'STAND_BY',
  'REFUSE',
  'ANNULE',
  'ATT_ACOMPTE',
  '19082024'
)
AND id NOT IN (
  SELECT DISTINCT statut_id
  FROM interventions
  WHERE statut_id IS NOT NULL
);

-- ============================================
-- Fin du script
-- ============================================
