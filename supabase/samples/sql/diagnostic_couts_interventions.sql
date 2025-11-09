-- ========================================
-- DIAGNOSTIC DES COÛTS D'INTERVENTIONS
-- ========================================
-- Script pour analyser les coûts et identifier les problèmes

-- 1. Vérifier les interventions récentes et leurs coûts
SELECT 
    'INTERVENTIONS RÉCENTES' as analyse,
    COUNT(*) as total_interventions,
    COUNT(ic.id) as interventions_avec_couts,
    COUNT(*) - COUNT(ic.id) as interventions_sans_couts
FROM interventions i
LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
WHERE i.created_at >= CURRENT_DATE - INTERVAL '7 days';

-- 2. Détail des interventions sans coûts
SELECT 
    'INTERVENTIONS SANS COÛTS' as analyse,
    i.id_inter,
    i.date,
    i.contexte_intervention,
    i.created_at
FROM interventions i
LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
WHERE i.created_at >= CURRENT_DATE - INTERVAL '7 days'
AND ic.id IS NULL
ORDER BY i.created_at DESC
LIMIT 10;

-- 3. Vérifier les coûts orphelins (sans intervention)
SELECT 
    'COÛTS ORPHELINS' as analyse,
    COUNT(*) as nombre_couts_orphelins
FROM intervention_costs ic
LEFT JOIN interventions i ON ic.intervention_id = i.id
WHERE i.id IS NULL;

-- 4. Analyse des coûts par type et montant
SELECT 
    'ANALYSE DÉTAILLÉE DES COÛTS' as analyse,
    ic.cost_type,
    COUNT(*) as nombre_couts,
    SUM(ic.amount) as montant_total,
    AVG(ic.amount) as montant_moyen,
    MIN(ic.amount) as montant_min,
    MAX(ic.amount) as montant_max,
    COUNT(CASE WHEN ic.amount = 0 THEN 1 END) as couts_zero,
    COUNT(CASE WHEN ic.amount IS NULL THEN 1 END) as couts_null,
    ic.currency
FROM intervention_costs ic
INNER JOIN interventions i ON ic.intervention_id = i.id
WHERE i.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY ic.cost_type, ic.currency
ORDER BY ic.cost_type;

-- 5. Vérifier la cohérence des totaux
SELECT 
    'VÉRIFICATION COHÉRENCE TOTAUX' as analyse,
    i.id_inter,
    i.date,
    -- Coûts SST
    COALESCE(SUM(CASE WHEN ic.cost_type = 'sst' THEN ic.amount ELSE 0 END), 0) as cout_sst,
    -- Coûts matériel
    COALESCE(SUM(CASE WHEN ic.cost_type = 'materiel' THEN ic.amount ELSE 0 END), 0) as cout_materiel,
    -- Coûts intervention
    COALESCE(SUM(CASE WHEN ic.cost_type = 'intervention' THEN ic.amount ELSE 0 END), 0) as cout_intervention,
    -- Total déclaré
    COALESCE(SUM(CASE WHEN ic.cost_type = 'marge' THEN ic.amount ELSE 0 END), 0) as total_declare,
    -- Total calculé
    COALESCE(SUM(CASE WHEN ic.cost_type IN ('sst', 'materiel', 'intervention') THEN ic.amount ELSE 0 END), 0) as total_calcule,
    -- Différence
    COALESCE(SUM(CASE WHEN ic.cost_type = 'marge' THEN ic.amount ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN ic.cost_type IN ('sst', 'materiel', 'intervention') THEN ic.amount ELSE 0 END), 0) as difference
FROM interventions i
LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
WHERE i.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY i.id, i.id_inter, i.date
HAVING COUNT(ic.id) > 0
ORDER BY ABS(COALESCE(SUM(CASE WHEN ic.cost_type = 'marge' THEN ic.amount ELSE 0 END), 0) - 
             COALESCE(SUM(CASE WHEN ic.cost_type IN ('sst', 'materiel', 'intervention') THEN ic.amount ELSE 0 END), 0)) DESC
LIMIT 10;

-- 6. Interventions avec IDs AUTO-XXX-YY et leurs coûts
SELECT 
    'INTERVENTIONS AUTO-ID ET COÛTS' as analyse,
    i.id_inter,
    i.date,
    COUNT(ic.id) as nombre_couts,
    SUM(ic.amount) as montant_total
FROM interventions i
LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
WHERE i.created_at >= CURRENT_DATE - INTERVAL '7 days'
AND i.id_inter LIKE 'AUTO-%'
GROUP BY i.id, i.id_inter, i.date
ORDER BY i.created_at DESC
LIMIT 10;

-- 7. Résumé global
SELECT 
    'RÉSUMÉ GLOBAL' as analyse,
    COUNT(DISTINCT i.id) as total_interventions,
    COUNT(DISTINCT ic.id) as total_couts,
    COUNT(DISTINCT CASE WHEN i.id_inter LIKE 'AUTO-%' THEN i.id END) as interventions_auto_id,
    COUNT(DISTINCT CASE WHEN i.id_inter NOT LIKE 'AUTO-%' AND i.id_inter IS NOT NULL THEN i.id END) as interventions_id_manuel,
    COUNT(DISTINCT CASE WHEN i.id_inter IS NULL THEN i.id END) as interventions_id_null
FROM interventions i
LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
WHERE i.created_at >= CURRENT_DATE - INTERVAL '7 days';
