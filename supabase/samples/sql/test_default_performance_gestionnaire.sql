-- Vérifier les objectifs existants avec les infos des gestionnaires

SELECT 
    u.id as user_id,
    u.username,
    u.firstname || ' ' || u.lastname as nom_complet,
    u.code_gestionnaire,
    gt.period_type,
    gt.margin_target,
    gt.performance_target,
    gt.created_at,
    gt.updated_at
FROM public.users u
LEFT JOIN public.gestionnaire_targets gt ON u.id = gt.user_id
WHERE u.username != 'admin'  -- Exclure l'admin
ORDER BY u.username, gt.period_type;

