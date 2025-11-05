-- ===== DIAGNOSTIC DES ID_INTER NULL =====
-- Requêtes pour analyser pourquoi id_inter est NULL dans les interventions

-- 1. STATISTIQUES GÉNÉRALES
-- =========================
SELECT 
    'STATISTIQUES ID_INTER' as analyse,
    COUNT(*) as total_interventions,
    COUNT(CASE WHEN id_inter IS NOT NULL AND id_inter != '' THEN 1 END) as avec_id_inter,
    COUNT(CASE WHEN id_inter IS NULL OR id_inter = '' THEN 1 END) as sans_id_inter,
    ROUND(COUNT(CASE WHEN id_inter IS NOT NULL AND id_inter != '' THEN 1 END) * 100.0 / COUNT(*), 2) as pourcentage_avec_id
FROM interventions
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';

-- 2. INTERVENTIONS SANS ID_INTER (DÉTAIL)
-- ======================================
SELECT 
    id,
    id_inter,
    date,
    adresse,
    ville,
    contexte_intervention,
    commentaire_agent,
    created_at
FROM interventions
WHERE (id_inter IS NULL OR id_inter = '')
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 20;

-- 3. INTERVENTIONS AVEC ID_INTER (EXEMPLES)
-- ========================================
SELECT 
    id,
    id_inter,
    date,
    adresse,
    ville,
    contexte_intervention,
    created_at
FROM interventions
WHERE id_inter IS NOT NULL 
  AND id_inter != ''
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 20;

-- 4. ANALYSE DES VALEURS ID_INTER
-- ===============================
SELECT 
    id_inter,
    COUNT(*) as nombre_occurrences,
    MIN(created_at) as premiere_occurrence,
    MAX(created_at) as derniere_occurrence
FROM interventions
WHERE id_inter IS NOT NULL 
  AND id_inter != ''
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY id_inter
ORDER BY nombre_occurrences DESC, id_inter
LIMIT 30;

-- 5. VÉRIFICATION DES DOUBLONS ID_INTER
-- ====================================
SELECT 
    id_inter,
    COUNT(*) as nombre_doublons,
    STRING_AGG(id::text, ', ') as ids_interventions
FROM interventions
WHERE id_inter IS NOT NULL 
  AND id_inter != ''
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY id_inter
HAVING COUNT(*) > 1
ORDER BY nombre_doublons DESC;

-- 6. INTERVENTIONS RÉCENTES SANS ID_INTER (CHRONOLOGIE)
-- ===================================================
SELECT 
    DATE(created_at) as date_import,
    COUNT(*) as total_interventions,
    COUNT(CASE WHEN id_inter IS NOT NULL AND id_inter != '' THEN 1 END) as avec_id_inter,
    COUNT(CASE WHEN id_inter IS NULL OR id_inter = '' THEN 1 END) as sans_id_inter
FROM interventions
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC;

-- 7. ANALYSE DES CONTEXTES D'INTERVENTION SANS ID_INTER
-- ====================================================
SELECT 
    CASE 
        WHEN contexte_intervention IS NULL OR contexte_intervention = '' THEN 'Contexte vide'
        WHEN LENGTH(contexte_intervention) < 50 THEN 'Contexte court'
        WHEN LENGTH(contexte_intervention) < 200 THEN 'Contexte moyen'
        ELSE 'Contexte long'
    END as type_contexte,
    COUNT(*) as nombre_interventions,
    COUNT(CASE WHEN id_inter IS NOT NULL AND id_inter != '' THEN 1 END) as avec_id_inter,
    COUNT(CASE WHEN id_inter IS NULL OR id_inter = '' THEN 1 END) as sans_id_inter
FROM interventions
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY 
    CASE 
        WHEN contexte_intervention IS NULL OR contexte_intervention = '' THEN 'Contexte vide'
        WHEN LENGTH(contexte_intervention) < 50 THEN 'Contexte court'
        WHEN LENGTH(contexte_intervention) < 200 THEN 'Contexte moyen'
        ELSE 'Contexte long'
    END
ORDER BY nombre_interventions DESC;

-- 8. EXEMPLES DE CONTEXTES SANS ID_INTER
-- =====================================
SELECT 
    id,
    SUBSTRING(contexte_intervention, 1, 100) as contexte_tronque,
    adresse,
    ville,
    created_at
FROM interventions
WHERE (id_inter IS NULL OR id_inter = '')
  AND contexte_intervention IS NOT NULL 
  AND contexte_intervention != ''
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 15;

-- 9. VÉRIFICATION DES COÛTS ASSOCIÉS AUX INTERVENTIONS SANS ID_INTER
-- ==================================================================
SELECT 
    'COÛTS INTERVENTIONS SANS ID_INTER' as analyse,
    COUNT(ic.id) as nombre_couts,
    SUM(ic.amount) as montant_total,
    AVG(ic.amount) as montant_moyen
FROM intervention_costs ic
INNER JOIN interventions i ON ic.intervention_id = i.id
WHERE (i.id_inter IS NULL OR i.id_inter = '')
  AND i.created_at >= CURRENT_DATE - INTERVAL '7 days';

-- 10. COMPARAISON AVEC LES INTERVENTIONS AVEC ID_INTER
-- ===================================================
SELECT 
    'COMPARAISON COÛTS' as analyse,
    CASE 
        WHEN i.id_inter IS NOT NULL AND i.id_inter != '' THEN 'Avec ID_INTER'
        ELSE 'Sans ID_INTER'
    END as type_intervention,
    COUNT(ic.id) as nombre_couts,
    SUM(ic.amount) as montant_total,
    AVG(ic.amount) as montant_moyen
FROM intervention_costs ic
INNER JOIN interventions i ON ic.intervention_id = i.id
WHERE i.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY 
    CASE 
        WHEN i.id_inter IS NOT NULL AND i.id_inter != '' THEN 'Avec ID_INTER'
        ELSE 'Sans ID_INTER'
    END
ORDER BY type_intervention;

-- 11. RECHERCHE DE PATTERNS DANS LES CONTEXTES
-- ============================================
-- Chercher des patterns qui pourraient contenir des IDs
SELECT 
    'PATTERNS DANS CONTEXTES' as analyse,
    CASE 
        WHEN contexte_intervention ~ '\d{4,}' THEN 'Contient numéro 4+ chiffres'
        WHEN contexte_intervention ~ 'INT[-_]?\d+' THEN 'Contient INT-XXXX'
        WHEN contexte_intervention ~ 'REF[-_]?\d+' THEN 'Contient REF-XXXX'
        WHEN contexte_intervention ~ '\d{5,}' THEN 'Contient numéro 5+ chiffres'
        ELSE 'Aucun pattern numérique'
    END as pattern_detecte,
    COUNT(*) as nombre_interventions
FROM interventions
WHERE (id_inter IS NULL OR id_inter = '')
  AND contexte_intervention IS NOT NULL 
  AND contexte_intervention != ''
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY 
    CASE 
        WHEN contexte_intervention ~ '\d{4,}' THEN 'Contient numéro 4+ chiffres'
        WHEN contexte_intervention ~ 'INT[-_]?\d+' THEN 'Contient INT-XXXX'
        WHEN contexte_intervention ~ 'REF[-_]?\d+' THEN 'Contient REF-XXXX'
        WHEN contexte_intervention ~ '\d{5,}' THEN 'Contient numéro 5+ chiffres'
        ELSE 'Aucun pattern numérique'
    END
ORDER BY nombre_interventions DESC;
