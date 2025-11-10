-- Compter les interventions par gestionnaire
-- ===========================================

-- 1. Compter les interventions directement assignées à chaque gestionnaire
SELECT 
  u.id as gestionnaire_id,
  u.firstname as gestionnaire_prenom,
  u.lastname as gestionnaire_nom,
  u.code_gestionnaire,
  COUNT(DISTINCT i.id) as nb_interventions_directes
FROM users u
LEFT JOIN interventions i ON u.id = i.assigned_user_id AND i.is_active = true
GROUP BY u.id, u.firstname, u.lastname, u.code_gestionnaire
ORDER BY nb_interventions_directes DESC;

-- 2. Compter le nombre d'interventions faites par les artisans gérés par chaque gestionnaire
SELECT 
  u.id as gestionnaire_id,
  u.firstname as gestionnaire_prenom,
  u.lastname as gestionnaire_nom,
  u.code_gestionnaire,
  COUNT(DISTINCT i.id) as nb_interventions_par_artisans
FROM users u
LEFT JOIN artisans a ON u.id = a.gestionnaire_id AND a.is_active = true
LEFT JOIN intervention_artisans ia ON a.id = ia.artisan_id
LEFT JOIN interventions i ON ia.intervention_id = i.id AND i.is_active = true
GROUP BY u.id, u.firstname, u.lastname, u.code_gestionnaire
ORDER BY nb_interventions_par_artisans DESC;

-- 3. Compter les interventions terminées (INTER_TERMINEE) par gestionnaire
-- (directes + via artisans)
SELECT 
  u.id as gestionnaire_id,
  u.firstname as gestionnaire_prenom,
  u.lastname as gestionnaire_nom,
  u.code_gestionnaire,
  COUNT(DISTINCT CASE WHEN ist_direct.code = 'INTER_TERMINEE' THEN i_direct.id END) as nb_interventions_terminees_directes,
  COUNT(DISTINCT CASE WHEN ist_via.code = 'INTER_TERMINEE' THEN i_via_artisan.id END) as nb_interventions_terminees_via_artisans,
  COUNT(DISTINCT CASE 
    WHEN ist_direct.code = 'INTER_TERMINEE' THEN i_direct.id 
    WHEN ist_via.code = 'INTER_TERMINEE' THEN i_via_artisan.id 
  END) as nb_interventions_terminees_total
FROM users u
LEFT JOIN interventions i_direct ON u.id = i_direct.assigned_user_id 
  AND i_direct.is_active = true
LEFT JOIN intervention_statuses ist_direct ON i_direct.statut_id = ist_direct.id
LEFT JOIN artisans a ON u.id = a.gestionnaire_id AND a.is_active = true
LEFT JOIN intervention_artisans ia ON a.id = ia.artisan_id
LEFT JOIN interventions i_via_artisan ON ia.intervention_id = i_via_artisan.id 
  AND i_via_artisan.is_active = true
LEFT JOIN intervention_statuses ist_via ON i_via_artisan.statut_id = ist_via.id
GROUP BY u.id, u.firstname, u.lastname, u.code_gestionnaire
HAVING COUNT(DISTINCT CASE 
  WHEN ist_direct.code = 'INTER_TERMINEE' THEN i_direct.id 
  WHEN ist_via.code = 'INTER_TERMINEE' THEN i_via_artisan.id 
END) > 0
ORDER BY nb_interventions_terminees_total DESC;

