-- ===== RÉSUMÉ COMPLET DE L'IMPORT =====
-- Vue d'ensemble de tous les éléments importés récemment

-- 1. RÉSUMÉ GLOBAL DE L'IMPORT
-- ============================
SELECT 
    'RÉSUMÉ GLOBAL' as section,
    '' as detail,
    '' as valeur,
    '' as commentaire
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
    'Interventions importées' as section,
    'Total' as detail,
    COUNT(*)::text as valeur,
    'Derniers 7 jours' as commentaire
FROM interventions
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
WHERE i.created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
    'Documents importés' as section,
    'Total' as detail,
    COUNT(*)::text as valeur,
    'Derniers 7 jours' as commentaire
FROM artisan_attachments aa
INNER JOIN artisans a ON aa.artisan_id = a.id
WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days';

-- 2. STATISTIQUES DÉTAILLÉES PAR TYPE
-- ==================================
SELECT 
    'STATISTIQUES DÉTAILLÉES' as section,
    '' as detail,
    '' as valeur,
    '' as commentaire
UNION ALL
SELECT 
    'Artisans' as section,
    'Avec prénom' as detail,
    COUNT(CASE WHEN prenom IS NOT NULL AND prenom != '' THEN 1 END)::text as valeur,
    ROUND(COUNT(CASE WHEN prenom IS NOT NULL AND prenom != '' THEN 1 END) * 100.0 / COUNT(*), 1)::text || '%' as commentaire
FROM artisans
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
    'Artisans' as section,
    'Avec nom' as detail,
    COUNT(CASE WHEN nom IS NOT NULL AND nom != '' THEN 1 END)::text as valeur,
    ROUND(COUNT(CASE WHEN nom IS NOT NULL AND nom != '' THEN 1 END) * 100.0 / COUNT(*), 1)::text || '%' as commentaire
FROM artisans
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
    'Artisans' as section,
    'Avec téléphone' as detail,
    COUNT(CASE WHEN telephone IS NOT NULL AND telephone != '' THEN 1 END)::text as valeur,
    ROUND(COUNT(CASE WHEN telephone IS NOT NULL AND telephone != '' THEN 1 END) * 100.0 / COUNT(*), 1)::text || '%' as commentaire
FROM artisans
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
    'Artisans' as section,
    'Avec email' as detail,
    COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END)::text as valeur,
    ROUND(COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) * 100.0 / COUNT(*), 1)::text || '%' as commentaire
FROM artisans
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
    'Interventions' as section,
    'Avec adresse' as detail,
    COUNT(CASE WHEN adresse IS NOT NULL AND adresse != '' THEN 1 END)::text as valeur,
    ROUND(COUNT(CASE WHEN adresse IS NOT NULL AND adresse != '' THEN 1 END) * 100.0 / COUNT(*), 1)::text || '%' as commentaire
FROM interventions
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
    'Interventions' as section,
    'Avec client' as detail,
    COUNT(CASE WHEN client_id IS NOT NULL THEN 1 END)::text as valeur,
    ROUND(COUNT(CASE WHEN client_id IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 1)::text || '%' as commentaire
FROM interventions
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
    'Clients' as section,
    'Avec prénom' as detail,
    COUNT(CASE WHEN firstname IS NOT NULL AND firstname != '' THEN 1 END)::text as valeur,
    ROUND(COUNT(CASE WHEN firstname IS NOT NULL AND firstname != '' THEN 1 END) * 100.0 / COUNT(*), 1)::text || '%' as commentaire
FROM clients
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
    'Clients' as section,
    'Avec email' as detail,
    COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END)::text as valeur,
    ROUND(COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) * 100.0 / COUNT(*), 1)::text || '%' as commentaire
FROM clients
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';

-- 3. RÉPARTITION DES COÛTS PAR TYPE
-- ================================
SELECT 
    'RÉPARTITION COÛTS' as section,
    ic.cost_type as detail,
    COUNT(*)::text as valeur,
    'Montant total: ' || SUM(ic.amount)::text || ' €' as commentaire
FROM intervention_costs ic
INNER JOIN interventions i ON ic.intervention_id = i.id
WHERE i.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY ic.cost_type
ORDER BY ic.cost_type;

-- 4. RÉPARTITION DES MÉTIERS
-- =========================
SELECT 
    'RÉPARTITION MÉTIERS' as section,
    m.label as detail,
    COUNT(am.id)::text as valeur,
    'Artisans assignés' as commentaire
FROM metiers m
INNER JOIN artisan_metiers am ON m.id = am.metier_id
INNER JOIN artisans a ON am.artisan_id = a.id
WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY m.id, m.label
ORDER BY COUNT(am.id) DESC
LIMIT 10;

-- 5. RÉPARTITION DES ZONES
-- =======================
SELECT 
    'RÉPARTITION ZONES' as section,
    z.label as detail,
    COUNT(az.id)::text as valeur,
    'Artisans assignés' as commentaire
FROM zones z
INNER JOIN artisan_zones az ON z.id = az.zone_id
INNER JOIN artisans a ON az.artisan_id = a.id
WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY z.id, z.label
ORDER BY COUNT(az.id) DESC
LIMIT 10;

-- 6. VÉRIFICATIONS DE QUALITÉ
-- ==========================
SELECT 
    'VÉRIFICATIONS QUALITÉ' as section,
    'Artisans sans métiers' as detail,
    COUNT(*)::text as valeur,
    'À vérifier' as commentaire
FROM artisans a
LEFT JOIN artisan_metiers am ON a.id = am.artisan_id
WHERE am.id IS NULL 
  AND a.created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
    'VÉRIFICATIONS QUALITÉ' as section,
    'Interventions sans coûts' as detail,
    COUNT(*)::text as valeur,
    'À vérifier' as commentaire
FROM interventions i
LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
WHERE ic.id IS NULL 
  AND i.created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
    'VÉRIFICATIONS QUALITÉ' as section,
    'Interventions sans client' as detail,
    COUNT(*)::text as valeur,
    'À vérifier' as commentaire
FROM interventions
WHERE client_id IS NULL 
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
    'VÉRIFICATIONS QUALITÉ' as section,
    'Documents Drive valides' as detail,
    COUNT(*)::text as valeur,
    'URLs Google Drive' as commentaire
FROM artisan_attachments aa
INNER JOIN artisans a ON aa.artisan_id = a.id
WHERE aa.url LIKE 'https://drive.google.com%'
  AND a.created_at >= CURRENT_DATE - INTERVAL '7 days';

-- 7. CHRONOLOGIE DE L'IMPORT
-- =========================
SELECT 
    'CHRONOLOGIE IMPORT' as section,
    DATE(created_at) as detail,
    COUNT(*)::text as valeur,
    'Éléments importés' as commentaire
FROM (
    SELECT created_at FROM artisans WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    UNION ALL
    SELECT created_at FROM interventions WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    UNION ALL
    SELECT created_at FROM clients WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
) all_imports
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC;
