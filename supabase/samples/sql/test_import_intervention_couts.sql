-- ===== STATISTIQUES DES MARGES D'INTERVENTION =====
-- Ce script permet d'analyser les marges calculées pour toutes les interventions du CRM
-- Les marges sont calculées comme : cout_intervention - cout_sst - cout_materiel
-- Le pourcentage de marge est calculé comme : (marge / cout_intervention) × 100

-- ============================================
-- 1. STATISTIQUES GLOBALES DES MARGES
-- ============================================
WITH marges_calculees AS (
  SELECT 
    i.id,
    i.id_inter,
    i.date,
    i.agence_id,
    i.metier_id,
    i.assigned_user_id,
    -- Extraire les coûts par type
    COALESCE(MAX(CASE WHEN ic.cost_type = 'intervention' THEN ic.amount END), 0) as cout_intervention,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'sst' THEN ic.amount END), 0) as cout_sst,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'materiel' THEN ic.amount END), 0) as cout_materiel,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'marge' THEN ic.amount END), NULL) as marge_stockee
  FROM interventions i
  LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
  WHERE i.is_active = true
    AND EXISTS (
      SELECT 1 FROM intervention_costs ic2 
      WHERE ic2.intervention_id = i.id 
      AND ic2.cost_type = 'intervention'
      AND ic2.amount > 0
    )
  GROUP BY i.id, i.id_inter, i.date, i.agence_id, i.metier_id, i.assigned_user_id
),
marges_avec_pourcentage AS (
  SELECT 
    *,
    -- Calculer la marge (utiliser la marge stockée si disponible, sinon calculer)
    COALESCE(marge_stockee, cout_intervention - cout_sst - cout_materiel) as marge,
    -- Calculer le pourcentage de marge
    CASE 
      WHEN cout_intervention > 0 THEN 
        ((COALESCE(marge_stockee, cout_intervention - cout_sst - cout_materiel)) / cout_intervention) * 100
      ELSE NULL
    END as marge_pourcentage
  FROM marges_calculees
  WHERE cout_intervention > 0
)
SELECT 
  '📊 STATISTIQUES GLOBALES DES MARGES' as titre,
  COUNT(*) as nombre_interventions_avec_couts,
  -- Statistiques en EUR
  ROUND(MIN(marge)::numeric, 2) as marge_minimale_eur,
  ROUND(MAX(marge)::numeric, 2) as marge_maximale_eur,
  ROUND(AVG(marge)::numeric, 2) as marge_moyenne_eur,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY marge)::numeric, 2) as marge_mediane_eur,
  ROUND(STDDEV(marge)::numeric, 2) as marge_ecart_type_eur,
  ROUND(SUM(marge)::numeric, 2) as marge_totale_eur,
  -- Statistiques en pourcentage
  ROUND(MIN(marge_pourcentage)::numeric, 2) as marge_minimale_pourcentage,
  ROUND(MAX(marge_pourcentage)::numeric, 2) as marge_maximale_pourcentage,
  ROUND(AVG(marge_pourcentage)::numeric, 2) as marge_moyenne_pourcentage,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY marge_pourcentage)::numeric, 2) as marge_mediane_pourcentage,
  ROUND(STDDEV(marge_pourcentage)::numeric, 2) as marge_ecart_type_pourcentage,
  -- Répartition
  COUNT(CASE WHEN marge < 0 THEN 1 END) as nombre_marges_negatives,
  COUNT(CASE WHEN marge >= 0 THEN 1 END) as nombre_marges_positives,
  COUNT(CASE WHEN marge = 0 THEN 1 END) as nombre_marges_nulles,
  ROUND(100.0 * COUNT(CASE WHEN marge < 0 THEN 1 END) / COUNT(*), 2) as pourcentage_marges_negatives,
  ROUND(100.0 * COUNT(CASE WHEN marge >= 0 THEN 1 END) / COUNT(*), 2) as pourcentage_marges_positives,
  -- Marges hors limites (-200% à 200%)
  COUNT(CASE WHEN marge_pourcentage < -200 OR marge_pourcentage > 200 THEN 1 END) as nombre_marges_hors_limites,
  ROUND(100.0 * COUNT(CASE WHEN marge_pourcentage < -200 OR marge_pourcentage > 200 THEN 1 END) / COUNT(*), 2) as pourcentage_marges_hors_limites
FROM marges_avec_pourcentage;

-- ============================================
-- 2. DISTRIBUTION DES MARGES PAR TRANCHES
-- ============================================
WITH marges_calculees AS (
  SELECT 
    i.id,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'intervention' THEN ic.amount END), 0) as cout_intervention,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'sst' THEN ic.amount END), 0) as cout_sst,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'materiel' THEN ic.amount END), 0) as cout_materiel,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'marge' THEN ic.amount END), NULL) as marge_stockee
  FROM interventions i
  LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
  WHERE i.is_active = true
    AND EXISTS (
      SELECT 1 FROM intervention_costs ic2 
      WHERE ic2.intervention_id = i.id 
      AND ic2.cost_type = 'intervention'
      AND ic2.amount > 0
    )
  GROUP BY i.id
),
marges_avec_pourcentage AS (
  SELECT 
    COALESCE(marge_stockee, cout_intervention - cout_sst - cout_materiel) as marge,
    CASE 
      WHEN cout_intervention > 0 THEN 
        ((COALESCE(marge_stockee, cout_intervention - cout_sst - cout_materiel)) / cout_intervention) * 100
      ELSE NULL
    END as marge_pourcentage
  FROM marges_calculees
  WHERE cout_intervention > 0
),
marges_avec_tranche AS (
  SELECT 
    marge,
    marge_pourcentage,
    CASE 
      WHEN marge_pourcentage < -200 THEN '< -200%'
      WHEN marge_pourcentage < -100 THEN '-200% à -100%'
      WHEN marge_pourcentage < -50 THEN '-100% à -50%'
      WHEN marge_pourcentage < 0 THEN '-50% à 0%'
      WHEN marge_pourcentage = 0 THEN '0%'
      WHEN marge_pourcentage <= 10 THEN '0% à 10%'
      WHEN marge_pourcentage <= 20 THEN '10% à 20%'
      WHEN marge_pourcentage <= 30 THEN '20% à 30%'
      WHEN marge_pourcentage <= 50 THEN '30% à 50%'
      WHEN marge_pourcentage <= 100 THEN '50% à 100%'
      WHEN marge_pourcentage <= 200 THEN '100% à 200%'
      ELSE '> 200%'
    END as tranche_marge,
    CASE 
      WHEN marge_pourcentage < -200 THEN 1
      WHEN marge_pourcentage < -100 THEN 2
      WHEN marge_pourcentage < -50 THEN 3
      WHEN marge_pourcentage < 0 THEN 4
      WHEN marge_pourcentage = 0 THEN 5
      WHEN marge_pourcentage <= 10 THEN 6
      WHEN marge_pourcentage <= 20 THEN 7
      WHEN marge_pourcentage <= 30 THEN 8
      WHEN marge_pourcentage <= 50 THEN 9
      WHEN marge_pourcentage <= 100 THEN 10
      WHEN marge_pourcentage <= 200 THEN 11
      ELSE 12
    END as ordre_tranche
  FROM marges_avec_pourcentage
)
SELECT 
  '📈 DISTRIBUTION DES MARGES PAR TRANCHES' as titre,
  tranche_marge,
  COUNT(*) as nombre_interventions,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as pourcentage_du_total,
  ROUND(AVG(marge)::numeric, 2) as marge_moyenne_eur,
  ROUND(AVG(marge_pourcentage)::numeric, 2) as marge_moyenne_pourcentage
FROM marges_avec_tranche
GROUP BY tranche_marge, ordre_tranche
ORDER BY ordre_tranche;

-- ============================================
-- 3. TOP 10 MEILLEURES MARGES
-- ============================================
WITH marges_calculees AS (
  SELECT 
    i.id,
    i.id_inter,
    i.date,
    i.adresse,
    i.ville,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'intervention' THEN ic.amount END), 0) as cout_intervention,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'sst' THEN ic.amount END), 0) as cout_sst,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'materiel' THEN ic.amount END), 0) as cout_materiel,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'marge' THEN ic.amount END), NULL) as marge_stockee
  FROM interventions i
  LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
  WHERE i.is_active = true
    AND EXISTS (
      SELECT 1 FROM intervention_costs ic2 
      WHERE ic2.intervention_id = i.id 
      AND ic2.cost_type = 'intervention'
      AND ic2.amount > 0
    )
  GROUP BY i.id, i.id_inter, i.date, i.adresse, i.ville
),
marges_avec_pourcentage AS (
  SELECT 
    id_inter,
    date,
    adresse,
    ville,
    cout_intervention,
    cout_sst,
    cout_materiel,
    COALESCE(marge_stockee, cout_intervention - cout_sst - cout_materiel) as marge,
    CASE 
      WHEN cout_intervention > 0 THEN 
        ((COALESCE(marge_stockee, cout_intervention - cout_sst - cout_materiel)) / cout_intervention) * 100
      ELSE NULL
    END as marge_pourcentage
  FROM marges_calculees
  WHERE cout_intervention > 0
)
SELECT 
  '🏆 TOP 10 MEILLEURES MARGES' as titre,
  id_inter,
  date,
  adresse,
  ville,
  ROUND(cout_intervention::numeric, 2) as cout_intervention_eur,
  ROUND(cout_sst::numeric, 2) as cout_sst_eur,
  ROUND(cout_materiel::numeric, 2) as cout_materiel_eur,
  ROUND(marge::numeric, 2) as marge_eur,
  ROUND(marge_pourcentage::numeric, 2) as marge_pourcentage
FROM marges_avec_pourcentage
ORDER BY marge DESC
LIMIT 10;

-- ============================================
-- 4. TOP 10 PIRES MARGES (NÉGATIVES)
-- ============================================
WITH marges_calculees AS (
  SELECT 
    i.id,
    i.id_inter,
    i.date,
    i.adresse,
    i.ville,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'intervention' THEN ic.amount END), 0) as cout_intervention,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'sst' THEN ic.amount END), 0) as cout_sst,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'materiel' THEN ic.amount END), 0) as cout_materiel,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'marge' THEN ic.amount END), NULL) as marge_stockee
  FROM interventions i
  LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
  WHERE i.is_active = true
    AND EXISTS (
      SELECT 1 FROM intervention_costs ic2 
      WHERE ic2.intervention_id = i.id 
      AND ic2.cost_type = 'intervention'
      AND ic2.amount > 0
    )
  GROUP BY i.id, i.id_inter, i.date, i.adresse, i.ville
),
marges_avec_pourcentage AS (
  SELECT 
    id_inter,
    date,
    adresse,
    ville,
    cout_intervention,
    cout_sst,
    cout_materiel,
    COALESCE(marge_stockee, cout_intervention - cout_sst - cout_materiel) as marge,
    CASE 
      WHEN cout_intervention > 0 THEN 
        ((COALESCE(marge_stockee, cout_intervention - cout_sst - cout_materiel)) / cout_intervention) * 100
      ELSE NULL
    END as marge_pourcentage
  FROM marges_calculees
  WHERE cout_intervention > 0
    AND COALESCE(marge_stockee, cout_intervention - cout_sst - cout_materiel) < 0
)
SELECT 
  '⚠️ TOP 10 PIRES MARGES (NÉGATIVES)' as titre,
  id_inter,
  date,
  adresse,
  ville,
  ROUND(cout_intervention::numeric, 2) as cout_intervention_eur,
  ROUND(cout_sst::numeric, 2) as cout_sst_eur,
  ROUND(cout_materiel::numeric, 2) as cout_materiel_eur,
  ROUND(marge::numeric, 2) as marge_eur,
  ROUND(marge_pourcentage::numeric, 2) as marge_pourcentage
FROM marges_avec_pourcentage
ORDER BY marge ASC
LIMIT 10;

-- ============================================
-- 5. MARGES HORS LIMITES (-200% à 200%)
-- ============================================
WITH marges_calculees AS (
  SELECT 
    i.id,
    i.id_inter,
    i.date,
    i.adresse,
    i.ville,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'intervention' THEN ic.amount END), 0) as cout_intervention,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'sst' THEN ic.amount END), 0) as cout_sst,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'materiel' THEN ic.amount END), 0) as cout_materiel,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'marge' THEN ic.amount END), NULL) as marge_stockee
  FROM interventions i
  LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
  WHERE i.is_active = true
    AND EXISTS (
      SELECT 1 FROM intervention_costs ic2 
      WHERE ic2.intervention_id = i.id 
      AND ic2.cost_type = 'intervention'
      AND ic2.amount > 0
    )
  GROUP BY i.id, i.id_inter, i.date, i.adresse, i.ville
),
marges_avec_pourcentage AS (
  SELECT 
    id_inter,
    date,
    adresse,
    ville,
    cout_intervention,
    cout_sst,
    cout_materiel,
    COALESCE(marge_stockee, cout_intervention - cout_sst - cout_materiel) as marge,
    CASE 
      WHEN cout_intervention > 0 THEN 
        ((COALESCE(marge_stockee, cout_intervention - cout_sst - cout_materiel)) / cout_intervention) * 100
      ELSE NULL
    END as marge_pourcentage
  FROM marges_calculees
  WHERE cout_intervention > 0
    AND (
      CASE 
        WHEN cout_intervention > 0 THEN 
          ((COALESCE(marge_stockee, cout_intervention - cout_sst - cout_materiel)) / cout_intervention) * 100
        ELSE NULL
      END < -200 
      OR 
      CASE 
        WHEN cout_intervention > 0 THEN 
          ((COALESCE(marge_stockee, cout_intervention - cout_sst - cout_materiel)) / cout_intervention) * 100
        ELSE NULL
      END > 200
    )
)
SELECT 
  '🚫 MARGES HORS LIMITES (-200% à 200%)' as titre,
  id_inter,
  date,
  adresse,
  ville,
  ROUND(cout_intervention::numeric, 2) as cout_intervention_eur,
  ROUND(cout_sst::numeric, 2) as cout_sst_eur,
  ROUND(cout_materiel::numeric, 2) as cout_materiel_eur,
  ROUND(marge::numeric, 2) as marge_eur,
  ROUND(marge_pourcentage::numeric, 2) as marge_pourcentage,
  CASE 
    WHEN marge_pourcentage < -200 THEN '⚠️ Marge < -200%'
    WHEN marge_pourcentage > 200 THEN '⚠️ Marge > 200%'
  END as statut
FROM marges_avec_pourcentage
ORDER BY ABS(marge_pourcentage) DESC;

-- ============================================
-- 6. STATISTIQUES PAR AGENCE
-- ============================================
WITH marges_calculees AS (
  SELECT 
    i.id,
    i.id_inter,
    i.agence_id,
    a.label as agence_nom,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'intervention' THEN ic.amount END), 0) as cout_intervention,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'sst' THEN ic.amount END), 0) as cout_sst,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'materiel' THEN ic.amount END), 0) as cout_materiel,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'marge' THEN ic.amount END), NULL) as marge_stockee
  FROM interventions i
  LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
  LEFT JOIN agencies a ON i.agence_id = a.id
  WHERE i.is_active = true
    AND EXISTS (
      SELECT 1 FROM intervention_costs ic2 
      WHERE ic2.intervention_id = i.id 
      AND ic2.cost_type = 'intervention'
      AND ic2.amount > 0
    )
  GROUP BY i.id, i.id_inter, i.agence_id, a.name
),
marges_avec_pourcentage AS (
  SELECT 
    agence_id,
    agence_nom,
    COALESCE(marge_stockee, cout_intervention - cout_sst - cout_materiel) as marge,
    CASE 
      WHEN cout_intervention > 0 THEN 
        ((COALESCE(marge_stockee, cout_intervention - cout_sst - cout_materiel)) / cout_intervention) * 100
      ELSE NULL
    END as marge_pourcentage
  FROM marges_calculees
  WHERE cout_intervention > 0
)
SELECT 
  '🏢 STATISTIQUES PAR AGENCE' as titre,
  COALESCE(agence_nom, 'Non assignée') as agence,
  COUNT(*) as nombre_interventions,
  ROUND(MIN(marge)::numeric, 2) as marge_min_eur,
  ROUND(MAX(marge)::numeric, 2) as marge_max_eur,
  ROUND(AVG(marge)::numeric, 2) as marge_moyenne_eur,
  ROUND(SUM(marge)::numeric, 2) as marge_totale_eur,
  ROUND(MIN(marge_pourcentage)::numeric, 2) as marge_min_pourcentage,
  ROUND(MAX(marge_pourcentage)::numeric, 2) as marge_max_pourcentage,
  ROUND(AVG(marge_pourcentage)::numeric, 2) as marge_moyenne_pourcentage,
  COUNT(CASE WHEN marge < 0 THEN 1 END) as nombre_marges_negatives,
  ROUND(100.0 * COUNT(CASE WHEN marge < 0 THEN 1 END) / COUNT(*), 2) as pourcentage_marges_negatives
FROM marges_avec_pourcentage
GROUP BY agence_id, agence_nom
ORDER BY marge_moyenne_pourcentage DESC;

-- ============================================
-- 7. STATISTIQUES PAR MÉTIER
-- ============================================
WITH marges_calculees AS (
  SELECT 
    i.id,
    i.id_inter,
    i.metier_id,
    m.label as metier_nom,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'intervention' THEN ic.amount END), 0) as cout_intervention,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'sst' THEN ic.amount END), 0) as cout_sst,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'materiel' THEN ic.amount END), 0) as cout_materiel,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'marge' THEN ic.amount END), NULL) as marge_stockee
  FROM interventions i
  LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
  LEFT JOIN metiers m ON i.metier_id = m.id
  WHERE i.is_active = true
    AND EXISTS (
      SELECT 1 FROM intervention_costs ic2 
      WHERE ic2.intervention_id = i.id 
      AND ic2.cost_type = 'intervention'
      AND ic2.amount > 0
    )
  GROUP BY i.id, i.id_inter, i.metier_id, m.name
),
marges_avec_pourcentage AS (
  SELECT 
    metier_id,
    metier_nom,
    COALESCE(marge_stockee, cout_intervention - cout_sst - cout_materiel) as marge,
    CASE 
      WHEN cout_intervention > 0 THEN 
        ((COALESCE(marge_stockee, cout_intervention - cout_sst - cout_materiel)) / cout_intervention) * 100
      ELSE NULL
    END as marge_pourcentage
  FROM marges_calculees
  WHERE cout_intervention > 0
)
SELECT 
  '🔧 STATISTIQUES PAR MÉTIER' as titre,
  COALESCE(metier_nom, 'Non assigné') as metier,
  COUNT(*) as nombre_interventions,
  ROUND(MIN(marge)::numeric, 2) as marge_min_eur,
  ROUND(MAX(marge)::numeric, 2) as marge_max_eur,
  ROUND(AVG(marge)::numeric, 2) as marge_moyenne_eur,
  ROUND(SUM(marge)::numeric, 2) as marge_totale_eur,
  ROUND(MIN(marge_pourcentage)::numeric, 2) as marge_min_pourcentage,
  ROUND(MAX(marge_pourcentage)::numeric, 2) as marge_max_pourcentage,
  ROUND(AVG(marge_pourcentage)::numeric, 2) as marge_moyenne_pourcentage,
  COUNT(CASE WHEN marge < 0 THEN 1 END) as nombre_marges_negatives,
  ROUND(100.0 * COUNT(CASE WHEN marge < 0 THEN 1 END) / COUNT(*), 2) as pourcentage_marges_negatives
FROM marges_avec_pourcentage
GROUP BY metier_id, metier_nom
ORDER BY marge_moyenne_pourcentage DESC;

-- ============================================
-- 8. STATISTIQUES PAR PÉRIODE (PAR MOIS)
-- ============================================
WITH marges_calculees AS (
  SELECT 
    i.id,
    i.id_inter,
    DATE_TRUNC('month', i.date) as mois,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'intervention' THEN ic.amount END), 0) as cout_intervention,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'sst' THEN ic.amount END), 0) as cout_sst,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'materiel' THEN ic.amount END), 0) as cout_materiel,
    COALESCE(MAX(CASE WHEN ic.cost_type = 'marge' THEN ic.amount END), NULL) as marge_stockee
  FROM interventions i
  LEFT JOIN intervention_costs ic ON i.id = ic.intervention_id
  WHERE i.is_active = true
    AND i.date IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM intervention_costs ic2 
      WHERE ic2.intervention_id = i.id 
      AND ic2.cost_type = 'intervention'
      AND ic2.amount > 0
    )
  GROUP BY i.id, i.id_inter, DATE_TRUNC('month', i.date)
),
marges_avec_pourcentage AS (
  SELECT 
    mois,
    COALESCE(marge_stockee, cout_intervention - cout_sst - cout_materiel) as marge,
    CASE 
      WHEN cout_intervention > 0 THEN 
        ((COALESCE(marge_stockee, cout_intervention - cout_sst - cout_materiel)) / cout_intervention) * 100
      ELSE NULL
    END as marge_pourcentage
  FROM marges_calculees
  WHERE cout_intervention > 0
)
SELECT 
  '📅 STATISTIQUES PAR MOIS' as titre,
  TO_CHAR(mois, 'YYYY-MM') as mois,
  COUNT(*) as nombre_interventions,
  ROUND(AVG(marge)::numeric, 2) as marge_moyenne_eur,
  ROUND(SUM(marge)::numeric, 2) as marge_totale_eur,
  ROUND(AVG(marge_pourcentage)::numeric, 2) as marge_moyenne_pourcentage,
  COUNT(CASE WHEN marge < 0 THEN 1 END) as nombre_marges_negatives,
  ROUND(100.0 * COUNT(CASE WHEN marge < 0 THEN 1 END) / COUNT(*), 2) as pourcentage_marges_negatives
FROM marges_avec_pourcentage
GROUP BY mois
ORDER BY mois DESC
LIMIT 12;

