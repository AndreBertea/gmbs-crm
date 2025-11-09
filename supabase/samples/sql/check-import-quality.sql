-- ========================================
-- REQUÊTES D'ANALYSE QUALITÉ D'IMPORT
-- ========================================
-- Ces requêtes permettent de vérifier la qualité de l'import des interventions
-- Date: 2025-10-18
-- Usage: Exécuter dans l'éditeur SQL de Supabase ou via psql

-- ========================================
-- 1️⃣ INTERVENTIONS AVEC/SANS STATUT
-- ========================================

-- Nombre total d'interventions
SELECT 
  COUNT(*) as total_interventions,
  COUNT(statut_id) as avec_statut,
  COUNT(*) - COUNT(statut_id) as sans_statut
FROM interventions
WHERE is_active = true;

-- Détail des interventions sans statut
SELECT 
  id,
  id_inter,
  date,
  adresse,
  ville,
  assigned_user_id,
  created_at
FROM interventions
WHERE statut_id IS NULL
  AND is_active = true
ORDER BY created_at DESC
LIMIT 20;


-- ========================================
-- 2️⃣ INTERVENTIONS AVEC/SANS COÛTS
-- ========================================

-- Statistiques globales
SELECT 
  COUNT(DISTINCT i.id) as total_interventions,
  COUNT(DISTINCT CASE WHEN ic.id IS NOT NULL THEN i.id END) as avec_couts,
  COUNT(DISTINCT i.id) - COUNT(DISTINCT CASE WHEN ic.id IS NOT NULL THEN i.id END) as sans_couts,
  ROUND(
    (COUNT(DISTINCT CASE WHEN ic.id IS NOT NULL THEN i.id END)::numeric / 
     NULLIF(COUNT(DISTINCT i.id), 0) * 100), 2
  ) as pourcentage_avec_couts
FROM interventions i
LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
WHERE i.is_active = true;

-- Détail des interventions AVEC coûts (par type)
SELECT 
  i.id,
  i.id_inter,
  i.date,
  COUNT(ic.id) as nombre_couts,
  COUNT(CASE WHEN ic.cost_type = 'sst' THEN 1 END) as cout_sst,
  COUNT(CASE WHEN ic.cost_type = 'materiel' THEN 1 END) as cout_materiel,
  COUNT(CASE WHEN ic.cost_type = 'intervention' THEN 1 END) as cout_intervention,
  COUNT(CASE WHEN ic.cost_type = 'marge' THEN 1 END) as cout_total,
  SUM(ic.amount) as montant_total
FROM interventions i
INNER JOIN intervention_costs ic ON i.id = ic.intervention_id
WHERE i.is_active = true
GROUP BY i.id, i.id_inter, i.date
ORDER BY i.date DESC
LIMIT 20;

-- Détail des interventions SANS coûts
SELECT 
  i.id,
  i.id_inter,
  i.date,
  i.adresse,
  i.ville,
  s.label as statut,
  u.firstname || ' ' || u.lastname as gestionnaire
FROM interventions i
LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
LEFT JOIN intervention_statuses s ON i.statut_id = s.id
LEFT JOIN users u ON i.assigned_user_id = u.id
WHERE i.is_active = true
  AND ic.id IS NULL
ORDER BY i.date DESC
LIMIT 20;


-- ========================================
-- 3️⃣ INTERVENTIONS AVEC/SANS ARTISANS
-- ========================================

-- Statistiques globales
SELECT 
  COUNT(DISTINCT i.id) as total_interventions,
  COUNT(DISTINCT CASE WHEN ia.id IS NOT NULL THEN i.id END) as avec_artisans,
  COUNT(DISTINCT i.id) - COUNT(DISTINCT CASE WHEN ia.id IS NOT NULL THEN i.id END) as sans_artisans,
  ROUND(
    (COUNT(DISTINCT CASE WHEN ia.id IS NOT NULL THEN i.id END)::numeric / 
     NULLIF(COUNT(DISTINCT i.id), 0) * 100), 2
  ) as pourcentage_avec_artisans
FROM interventions i
LEFT JOIN intervention_artisans ia ON i.id = ia.intervention_id
WHERE i.is_active = true;

-- Détail des interventions AVEC artisans (comptage par intervention)
SELECT 
  i.id,
  i.id_inter,
  i.date,
  i.adresse,
  COUNT(ia.id) as nombre_artisans,
  COUNT(CASE WHEN ia.is_primary THEN 1 END) as artisans_primaires,
  COUNT(CASE WHEN NOT ia.is_primary THEN 1 END) as artisans_secondaires,
  STRING_AGG(
    a.prenom || ' ' || a.nom || 
    CASE WHEN ia.is_primary THEN ' (primaire)' ELSE '' END,
    ', '
  ) as artisans
FROM interventions i
INNER JOIN intervention_artisans ia ON i.id = ia.intervention_id
LEFT JOIN artisans a ON ia.artisan_id = a.id
WHERE i.is_active = true
GROUP BY i.id, i.id_inter, i.date, i.adresse
ORDER BY i.date DESC
LIMIT 20;

-- Détail des interventions SANS artisans
SELECT 
  i.id,
  i.id_inter,
  i.date,
  i.adresse,
  i.ville,
  s.label as statut,
  m.label as metier,
  u.firstname || ' ' || u.lastname as gestionnaire
FROM interventions i
LEFT JOIN intervention_artisans ia ON i.id = ia.intervention_id
LEFT JOIN intervention_statuses s ON i.statut_id = s.id
LEFT JOIN metiers m ON i.metier_id = m.id
LEFT JOIN users u ON i.assigned_user_id = u.id
WHERE i.is_active = true
  AND ia.id IS NULL
ORDER BY i.date DESC
LIMIT 20;


-- ========================================
-- 4️⃣ RÉSUMÉ COMPLET DE QUALITÉ
-- ========================================

-- Vue d'ensemble complète
SELECT 
  'Total interventions' as metric,
  COUNT(*)::text as valeur
FROM interventions
WHERE is_active = true

UNION ALL

SELECT 
  'Avec statut',
  COUNT(*)::text
FROM interventions
WHERE is_active = true AND statut_id IS NOT NULL

UNION ALL

SELECT 
  'Sans statut',
  COUNT(*)::text
FROM interventions
WHERE is_active = true AND statut_id IS NULL

UNION ALL

SELECT 
  'Avec au moins 1 coût',
  COUNT(DISTINCT i.id)::text
FROM interventions i
INNER JOIN intervention_costs ic ON i.id = ic.intervention_id
WHERE i.is_active = true

UNION ALL

SELECT 
  'Sans coûts',
  COUNT(DISTINCT i.id)::text
FROM interventions i
LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
WHERE i.is_active = true AND ic.id IS NULL

UNION ALL

SELECT 
  'Avec au moins 1 artisan',
  COUNT(DISTINCT i.id)::text
FROM interventions i
INNER JOIN intervention_artisans ia ON i.id = ia.intervention_id
WHERE i.is_active = true

UNION ALL

SELECT 
  'Sans artisans',
  COUNT(DISTINCT i.id)::text
FROM interventions i
LEFT JOIN intervention_artisans ia ON i.id = ia.intervention_id
WHERE i.is_active = true AND ia.id IS NULL

UNION ALL

SELECT 
  'Avec tenant (locataire)',
  COUNT(*)::text
FROM interventions
WHERE is_active = true AND tenant_id IS NOT NULL

UNION ALL

SELECT 
  'Avec owner (propriétaire)',
  COUNT(*)::text
FROM interventions
WHERE is_active = true AND owner_id IS NOT NULL

UNION ALL

SELECT 
  'Avec métier',
  COUNT(*)::text
FROM interventions
WHERE is_active = true AND metier_id IS NOT NULL

UNION ALL

SELECT 
  'Avec gestionnaire',
  COUNT(*)::text
FROM interventions
WHERE is_active = true AND assigned_user_id IS NOT NULL;


-- ========================================
-- 5️⃣ QUALITÉ DES DONNÉES PAR MÉTRIQUE
-- ========================================

-- Analyse détaillée des champs remplis
SELECT 
  COUNT(*) as total,
  COUNT(statut_id) as avec_statut,
  COUNT(metier_id) as avec_metier,
  COUNT(assigned_user_id) as avec_gestionnaire,
  COUNT(agence_id) as avec_agence,
  COUNT(tenant_id) as avec_tenant,
  COUNT(owner_id) as avec_owner,
  COUNT(adresse) as avec_adresse,
  COUNT(ville) as avec_ville,
  COUNT(code_postal) as avec_code_postal,
  COUNT(latitude) as avec_coordonnees_gps,
  COUNT(contexte_intervention) as avec_contexte,
  COUNT(commentaire_agent) as avec_commentaire,
  ROUND(AVG(CASE WHEN statut_id IS NOT NULL THEN 1 ELSE 0 END) * 100, 2) as pct_statut,
  ROUND(AVG(CASE WHEN metier_id IS NOT NULL THEN 1 ELSE 0 END) * 100, 2) as pct_metier,
  ROUND(AVG(CASE WHEN assigned_user_id IS NOT NULL THEN 1 ELSE 0 END) * 100, 2) as pct_gestionnaire
FROM interventions
WHERE is_active = true;


-- ========================================
-- 6️⃣ INTERVENTIONS PROBLÉMATIQUES
-- ========================================

-- Interventions "complètes" vs "incomplètes"
-- Une intervention complète a : statut, date, artisan, au moins 1 coût

WITH intervention_quality AS (
  SELECT 
    i.id,
    i.id_inter,
    i.date,
    i.adresse,
    s.label as statut,
    CASE WHEN i.statut_id IS NOT NULL THEN 1 ELSE 0 END as has_statut,
    CASE WHEN i.date IS NOT NULL THEN 1 ELSE 0 END as has_date,
    CASE WHEN ia.id IS NOT NULL THEN 1 ELSE 0 END as has_artisan,
    CASE WHEN ic.id IS NOT NULL THEN 1 ELSE 0 END as has_cout,
    CASE WHEN i.metier_id IS NOT NULL THEN 1 ELSE 0 END as has_metier,
    CASE WHEN i.assigned_user_id IS NOT NULL THEN 1 ELSE 0 END as has_gestionnaire,
    (
      CASE WHEN i.statut_id IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN i.date IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN ia.id IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN ic.id IS NOT NULL THEN 1 ELSE 0 END
    ) as quality_score
  FROM interventions i
  LEFT JOIN intervention_statuses s ON i.statut_id = s.id
  LEFT JOIN intervention_artisans ia ON i.id = ia.intervention_id
  LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
  WHERE i.is_active = true
)
SELECT 
  quality_score,
  COUNT(*) as nombre_interventions,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM interventions WHERE is_active = true) * 100, 2) as pourcentage,
  CASE 
    WHEN quality_score = 4 THEN '✅ Complètes'
    WHEN quality_score >= 2 THEN '⚠️  Partielles'
    ELSE '❌ Incomplètes'
  END as categorie
FROM intervention_quality
GROUP BY quality_score
ORDER BY quality_score DESC;


-- ========================================
-- 7️⃣ TOP INTERVENTIONS À CORRIGER
-- ========================================

-- Les 20 interventions les plus "incomplètes" à corriger en priorité
WITH intervention_completeness AS (
  SELECT 
    i.id,
    i.id_inter,
    i.date,
    i.adresse,
    i.ville,
    s.label as statut,
    (
      CASE WHEN i.statut_id IS NULL THEN 'statut manquant, ' ELSE '' END ||
      CASE WHEN i.date IS NULL THEN 'date manquante, ' ELSE '' END ||
      CASE WHEN ia.id IS NULL THEN 'aucun artisan, ' ELSE '' END ||
      CASE WHEN ic.id IS NULL THEN 'aucun coût, ' ELSE '' END ||
      CASE WHEN i.metier_id IS NULL THEN 'métier manquant, ' ELSE '' END ||
      CASE WHEN i.assigned_user_id IS NULL THEN 'gestionnaire manquant, ' ELSE '' END
    ) as problemes,
    (
      CASE WHEN i.statut_id IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN i.date IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN ia.id IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN ic.id IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN i.metier_id IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN i.assigned_user_id IS NOT NULL THEN 1 ELSE 0 END
    ) as score_qualite
  FROM interventions i
  LEFT JOIN intervention_statuses s ON i.statut_id = s.id
  LEFT JOIN intervention_artisans ia ON i.id = ia.intervention_id
  LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
  WHERE i.is_active = true
)
SELECT 
  id_inter,
  date,
  adresse,
  ville,
  statut,
  TRIM(TRAILING ', ' FROM problemes) as problemes_detectes,
  score_qualite || '/6' as completude
FROM intervention_completeness
WHERE score_qualite < 6
ORDER BY score_qualite ASC, date DESC
LIMIT 20;


-- ========================================
-- 8️⃣ STATISTIQUES PAR STATUT
-- ========================================

-- Répartition des interventions par statut avec qualité des données
SELECT 
  COALESCE(s.label, '(Sans statut)') as statut,
  s.color,
  COUNT(i.id) as nombre_interventions,
  COUNT(DISTINCT ia.artisan_id) as nombre_artisans_distincts,
  COUNT(DISTINCT ic.id) as nombre_couts_total,
  ROUND(AVG(ic.amount), 2) as cout_moyen,
  COUNT(CASE WHEN i.tenant_id IS NOT NULL THEN 1 END) as avec_tenant,
  COUNT(CASE WHEN i.owner_id IS NOT NULL THEN 1 END) as avec_owner
FROM interventions i
LEFT JOIN intervention_statuses s ON i.statut_id = s.id
LEFT JOIN intervention_artisans ia ON i.id = ia.intervention_id
LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
WHERE i.is_active = true
GROUP BY s.id, s.label, s.color, s.sort_order
ORDER BY s.sort_order NULLS LAST;

