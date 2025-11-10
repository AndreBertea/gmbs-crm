-- ===== REQUÊTES DE TEST POUR LES INTERVENTIONS IMPORTÉES =====
-- Ces requêtes permettent de vérifier la bonne insertion des interventions, coûts et clients

-- 1. VUE D'ENSEMBLE DES INTERVENTIONS IMPORTÉES
-- =============================================
SELECT 
    COUNT(*) as total_interventions,
    COUNT(CASE WHEN is_active = true THEN 1 END) as interventions_actives,
    COUNT(CASE WHEN is_active = false THEN 1 END) as interventions_inactives,
    MIN(created_at) as premiere_importation,
    MAX(created_at) as derniere_importation
FROM interventions
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';

-- 2. INTERVENTIONS AVEC LEURS COÛTS ASSOCIÉS
-- ==========================================
SELECT 
    i.id,
    i.id_inter,
    i.date,
    i.adresse,
    i.ville,
    i.code_postal,
    i.contexte_intervention,
    i.consigne_intervention,
    i.statut_id,
    i.metier_id,
    i.agence_id,
    i.assigned_user_id,
    -- Coûts associés
    COUNT(ic.id) as nombre_couts,
    SUM(CASE WHEN ic.cost_type = 'sst' THEN ic.amount ELSE 0 END) as cout_sst_total,
    SUM(CASE WHEN ic.cost_type = 'materiel' THEN ic.amount ELSE 0 END) as cout_materiel_total,
    SUM(CASE WHEN ic.cost_type = 'intervention' THEN ic.amount ELSE 0 END) as cout_intervention_total,
    SUM(CASE WHEN ic.cost_type = 'marge' THEN ic.amount ELSE 0 END) as cout_total,
    SUM(ic.amount) as cout_global
FROM interventions i
LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
WHERE i.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY i.id, i.id_inter, i.date, i.adresse, i.ville, i.code_postal, 
         i.contexte_intervention, i.consigne_intervention, i.statut_id, 
         i.metier_id, i.agence_id, i.assigned_user_id
ORDER BY i.created_at DESC
LIMIT 20;

-- 3. DÉTAIL DES COÛTS PAR INTERVENTION
-- ===================================
SELECT 
    i.id_inter,
    i.date,
    i.adresse,
    i.ville,
    ic.cost_type,
    ic.label,
    ic.amount,
    ic.currency,
    ic.created_at as cout_created_at
FROM interventions i
INNER JOIN intervention_costs ic ON i.id = ic.intervention_id
WHERE i.created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY i.created_at DESC, ic.cost_type
LIMIT 50;

-- 4. INTERVENTIONS SANS COÛTS (À VÉRIFIER)
-- =======================================
SELECT 
    i.id,
    i.id_inter,
    i.date,
    i.adresse,
    i.ville,
    i.contexte_intervention,
    i.created_at
FROM interventions i
LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
WHERE ic.id IS NULL 
  AND i.created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY i.created_at DESC;

-- 5. STATISTIQUES DES COÛTS PAR TYPE
-- =================================
SELECT 
    ic.cost_type,
    COUNT(*) as nombre_couts,
    SUM(ic.amount) as montant_total,
    AVG(ic.amount) as montant_moyen,
    MIN(ic.amount) as montant_min,
    MAX(ic.amount) as montant_max,
    ic.currency
FROM intervention_costs ic
INNER JOIN interventions i ON ic.intervention_id = i.id
WHERE i.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY ic.cost_type, ic.currency
ORDER BY ic.cost_type;

-- 10. VÉRIFICATION DE L'INTÉGRITÉ DES DONNÉES
-- ==========================================
SELECT 
    'Interventions' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN id_inter IS NOT NULL AND id_inter != '' THEN 1 END) as avec_id_inter,
    COUNT(CASE WHEN date IS NOT NULL THEN 1 END) as avec_date,
    COUNT(CASE WHEN adresse IS NOT NULL AND adresse != '' THEN 1 END) as avec_adresse
FROM interventions
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'

UNION ALL

SELECT 
    'Coûts' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN cost_type IS NOT NULL THEN 1 END) as avec_type,
    COUNT(CASE WHEN amount > 0 THEN 1 END) as avec_montant_positif,
    COUNT(CASE WHEN intervention_id IS NOT NULL THEN 1 END) as avec_intervention_id
FROM intervention_costs ic
INNER JOIN interventions i ON ic.intervention_id = i.id
WHERE i.created_at >= CURRENT_DATE - INTERVAL '7 days';

-- 11. RECHERCHE D'INTERVENTIONS SPÉCIFIQUES (EXEMPLE)
-- ==================================================
-- Remplacez les valeurs par vos données de test
SELECT 
    i.*,
    COUNT(ic.id) as nombre_couts,
    SUM(ic.amount) as cout_total
FROM interventions i
LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
WHERE i.id_inter LIKE '%VOTRE_ID_INTER%'  -- Remplacez par un ID réel
   OR i.adresse ILIKE '%VOTRE_ADRESSE%'   -- Remplacez par une adresse réelle
   OR i.ville ILIKE '%VOTRE_VILLE%'       -- Remplacez par une ville réelle
GROUP BY i.id
ORDER BY i.created_at DESC;
