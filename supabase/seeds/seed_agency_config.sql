-- Seed: Populate agency_config for agencies requiring reference
-- Related: BR-AGN-001
-- Date: 2025-11-06
--
-- ⚠️ IMPORTANT: Ce seed doit être exécuté APRÈS npm run import:all
-- Car il dépend de la présence des agences dans la table 'agencies'
--
-- This seed populates the agency_config table with the 3 agencies
-- that require a reference field: ImoDirect, AFEDIM, Oqoro

INSERT INTO agency_config (agency_id, requires_reference)
SELECT id, true 
FROM agencies 
WHERE LOWER(label) IN ('imodirect', 'afedim', 'oqoro')
   OR LOWER(code) IN ('imodirect', 'afedim', 'oqoro')
ON CONFLICT (agency_id) DO UPDATE
SET requires_reference = EXCLUDED.requires_reference;

-- Verify
SELECT 
  a.label as name,
  a.code,
  ac.requires_reference,
  ac.created_at
FROM agencies a
JOIN agency_config ac ON a.id = ac.agency_id
ORDER BY a.label;

