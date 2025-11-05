-- ===== TESTS DE COHÉRENCE DES DONNÉES =====
-- Requêtes pour comparer les données entre différentes sources et vérifier l'intégrité

-- 1. RÉSUMÉ GÉNÉRAL DES DONNÉES IMPORTÉES
-- =======================================
SELECT 
    'RÉSUMÉ GÉNÉRAL' as section,
    '' as detail,
    '' as valeur,
    '' as commentaire
UNION ALL
SELECT 
    'Interventions importées' as section,
    'Total' as detail,
    COUNT(*)::text as valeur,
    'Derniers 7 jours' as commentaire
FROM interventions
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
    'Artisans importés' as section,
    'Total' as detail,
    COUNT(*)::text as valeur,
    'Derniers 7 jours' as commentaire
FROM artisans
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
    'Clients importés' as section,
    'Total' as detail,
    COUNT(*)::text as valeur,
    'Derniers 7 jours' as commentaire
FROM clients
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
    'Coûts importés' as section,
    'Total' as detail,
    COUNT(*)::text as valeur,
    'Derniers 7 jours' as commentaire
FROM intervention_costs ic
INNER JOIN interventions i ON ic.intervention_id = i.id
WHERE i.created_at >= CURRENT_DATE - INTERVAL '7 days';

-- 2. ANALYSE DES ID_INTER DANS LES INTERVENTIONS
-- =============================================
SELECT 
    'ANALYSE ID_INTER' as section,
    '' as detail,
    '' as valeur,
    '' as commentaire
UNION ALL
SELECT 
    'Interventions avec ID valide' as section,
    'Total' as detail,
    COUNT(*)::text as valeur,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM interventions WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'), 2)::text || '%' as commentaire
FROM interventions
WHERE id_inter IS NOT NULL 
  AND id_inter != ''
  AND NOT id_inter LIKE 'AUTO-%'
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
    'Interventions avec ID auto-généré' as section,
    'Total' as detail,
    COUNT(*)::text as valeur,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM interventions WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'), 2)::text || '%' as commentaire
FROM interventions
WHERE id_inter LIKE 'AUTO-%'
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
    'Interventions sans ID' as section,
    'Total' as detail,
    COUNT(*)::text as valeur,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM interventions WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'), 2)::text || '%' as commentaire
FROM interventions
WHERE (id_inter IS NULL OR id_inter = '')
  AND created_at >= CURRENT_DATE - INTERVAL '7 days';

-- 3. VÉRIFICATION DES DOUBLONS ID_INTER
-- ====================================
SELECT 
    'VÉRIFICATION DOUBLONS' as section,
    id_inter as detail,
    COUNT(*)::text as valeur,
    'Doublons détectés' as commentaire
FROM interventions
WHERE id_inter IS NOT NULL 
  AND id_inter != ''
  AND NOT id_inter LIKE 'AUTO-%'
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY id_inter
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 10;

-- 4. COMPARAISON INTERVENTIONS AVEC/SANS COÛTS
-- ============================================
SELECT 
    'COMPARAISON COÛTS' as section,
    CASE 
        WHEN ic.id IS NOT NULL THEN 'Avec coûts'
        ELSE 'Sans coûts'
    END as detail,
    COUNT(i.id)::text as valeur,
    ROUND(COUNT(i.id) * 100.0 / (SELECT COUNT(*) FROM interventions WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'), 2)::text || '%' as commentaire
FROM interventions i
LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
WHERE i.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY 
    CASE 
        WHEN ic.id IS NOT NULL THEN 'Avec coûts'
        ELSE 'Sans coûts'
    END
ORDER BY detail;

-- 5. COMPARAISON INTERVENTIONS AVEC/SANS CLIENTS
-- =============================================
SELECT 
    'COMPARAISON CLIENTS' as section,
    CASE 
        WHEN i.client_id IS NOT NULL THEN 'Avec client'
        ELSE 'Sans client'
    END as detail,
    COUNT(i.id)::text as valeur,
    ROUND(COUNT(i.id) * 100.0 / (SELECT COUNT(*) FROM interventions WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'), 2)::text || '%' as commentaire
FROM interventions i
WHERE i.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY 
    CASE 
        WHEN i.client_id IS NOT NULL THEN 'Avec client'
        ELSE 'Sans client'
    END
ORDER BY detail;

-- 6. ANALYSE DES ARTISANS AVEC MÉTIERS
-- ===================================
SELECT 
    'ANALYSE ARTISANS MÉTIERS' as section,
    CASE 
        WHEN am.id IS NOT NULL THEN 'Avec métiers'
        ELSE 'Sans métiers'
    END as detail,
    COUNT(a.id)::text as valeur,
    ROUND(COUNT(a.id) * 100.0 / (SELECT COUNT(*) FROM artisans WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'), 2)::text || '%' as commentaire
FROM artisans a
LEFT JOIN artisan_metiers am ON a.id = am.artisan_id
WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY 
    CASE 
        WHEN am.id IS NOT NULL THEN 'Avec métiers'
        ELSE 'Sans métiers'
    END
ORDER BY detail;

-- 7. ANALYSE DES ARTISANS AVEC ZONES
-- =================================
SELECT 
    'ANALYSE ARTISANS ZONES' as section,
    CASE 
        WHEN az.id IS NOT NULL THEN 'Avec zones'
        ELSE 'Sans zones'
    END as detail,
    COUNT(a.id)::text as valeur,
    ROUND(COUNT(a.id) * 100.0 / (SELECT COUNT(*) FROM artisans WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'), 2)::text || '%' as commentaire
FROM artisans a
LEFT JOIN artisan_zones az ON a.id = az.artisan_id
WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY 
    CASE 
        WHEN az.id IS NOT NULL THEN 'Avec zones'
        ELSE 'Sans zones'
    END
ORDER BY detail;

-- 8. ANALYSE DES ARTISANS AVEC DOCUMENTS
-- =====================================
SELECT 
    'ANALYSE ARTISANS DOCUMENTS' as section,
    CASE 
        WHEN aa.id IS NOT NULL THEN 'Avec documents'
        ELSE 'Sans documents'
    END as detail,
    COUNT(a.id)::text as valeur,
    ROUND(COUNT(a.id) * 100.0 / (SELECT COUNT(*) FROM artisans WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'), 2)::text || '%' as commentaire
FROM artisans a
LEFT JOIN artisan_attachments aa ON a.id = aa.artisan_id
WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY 
    CASE 
        WHEN aa.id IS NOT NULL THEN 'Avec documents'
        ELSE 'Sans documents'
    END
ORDER BY detail;

-- 9. VÉRIFICATION DE L'INTÉGRITÉ DES RELATIONS
-- ===========================================
SELECT 
    'VÉRIFICATION INTÉGRITÉ' as section,
    'Interventions orphelines' as detail,
    COUNT(*)::text as valeur,
    'Sans agence, statut ou métier' as commentaire
FROM interventions i
WHERE i.created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND (i.agence_id IS NULL OR i.statut_id IS NULL OR i.metier_id IS NULL)
UNION ALL
SELECT 
    'VÉRIFICATION INTÉGRITÉ' as section,
    'Coûts orphelins' as detail,
    COUNT(*)::text as valeur,
    'Sans intervention associée' as commentaire
FROM intervention_costs ic
LEFT JOIN interventions i ON ic.intervention_id = i.id
WHERE i.id IS NULL
UNION ALL
SELECT 
    'VÉRIFICATION INTÉGRITÉ' as section,
    'Métiers orphelins' as detail,
    COUNT(*)::text as valeur,
    'Sans artisan associé' as commentaire
FROM artisan_metiers am
LEFT JOIN artisans a ON am.artisan_id = a.id
WHERE a.id IS NULL
UNION ALL
SELECT 
    'VÉRIFICATION INTÉGRITÉ' as section,
    'Zones orphelines' as detail,
    COUNT(*)::text as valeur,
    'Sans artisan associé' as commentaire
FROM artisan_zones az
LEFT JOIN artisans a ON az.artisan_id = a.id
WHERE a.id IS NULL;

-- 10. CHRONOLOGIE DES IMPORTATIONS
-- ===============================
SELECT 
    'CHRONOLOGIE IMPORT' as section,
    DATE(created_at) as detail,
    COUNT(*)::text as valeur,
    'Éléments importés' as commentaire
FROM (
    SELECT created_at FROM interventions WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    UNION ALL
    SELECT created_at FROM artisans WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    UNION ALL
    SELECT created_at FROM clients WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
) all_imports
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC;

-- 11. EXEMPLES D'INTERVENTIONS AVEC ID AUTO-GÉNÉRÉ
-- ===============================================
SELECT 
    'EXEMPLES ID AUTO-GÉNÉRÉ' as section,
    id_inter as detail,
    date::text as valeur,
    adresse as commentaire
FROM interventions
WHERE id_inter LIKE 'AUTO-%'
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

-- 12. STATISTIQUES DES COÛTS PAR TYPE
-- ==================================
SELECT 
    'STATISTIQUES COÛTS' as section,
    ic.cost_type as detail,
    COUNT(*)::text as valeur,
    'Montant total: ' || SUM(ic.amount)::text || ' €' as commentaire
FROM intervention_costs ic
INNER JOIN interventions i ON ic.intervention_id = i.id
WHERE i.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY ic.cost_type
ORDER BY ic.cost_type;

-- 13. VÉRIFICATION DES DONNÉES MANQUANTES
-- ======================================
SELECT 
    'DONNÉES MANQUANTES' as section,
    'Interventions sans adresse' as detail,
    COUNT(*)::text as valeur,
    'À compléter' as commentaire
FROM interventions
WHERE (adresse IS NULL OR adresse = '')
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
    'DONNÉES MANQUANTES' as section,
    'Interventions sans ville' as detail,
    COUNT(*)::text as valeur,
    'À compléter' as commentaire
FROM interventions
WHERE (ville IS NULL OR ville = '')
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
    'DONNÉES MANQUANTES' as section,
    'Artisans sans téléphone' as detail,
    COUNT(*)::text as valeur,
    'À compléter' as commentaire
FROM artisans
WHERE (telephone IS NULL OR telephone = '')
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
    'DONNÉES MANQUANTES' as section,
    'Artisans sans email' as detail,
    COUNT(*)::text as valeur,
    'À compléter' as commentaire
FROM artisans
WHERE (email IS NULL OR email = '')
  AND created_at >= CURRENT_DATE - INTERVAL '7 days';
