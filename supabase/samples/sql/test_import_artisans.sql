-- ===== REQUÊTES DE TEST POUR LES ARTISANS IMPORTÉS =====
-- Ces requêtes permettent de vérifier la bonne insertion des artisans, métiers, zones et documents

-- 1. VUE D'ENSEMBLE DES ARTISANS IMPORTÉS
-- ======================================
SELECT 
    COUNT(*) as total_artisans,
    COUNT(CASE WHEN is_active = true THEN 1 END) as artisans_actifs,
    COUNT(CASE WHEN is_active = false THEN 1 END) as artisans_inactifs,
    COUNT(CASE WHEN prenom IS NOT NULL AND prenom != '' THEN 1 END) as avec_prenom,
    COUNT(CASE WHEN nom IS NOT NULL AND nom != '' THEN 1 END) as avec_nom,
    COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as avec_email,
    COUNT(CASE WHEN telephone IS NOT NULL AND telephone != '' THEN 1 END) as avec_telephone,
    MIN(created_at) as premiere_importation,
    MAX(created_at) as derniere_importation
FROM artisans
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';

-- 2. ARTISANS AVEC LEURS MÉTIERS ASSOCIÉS
-- =======================================
SELECT 
    a.id,
    a.prenom,
    a.nom,
    a.telephone,
    a.email,
    a.raison_sociale,
    a.siret,
    a.statut_id,
    a.gestionnaire_id,
    a.adresse_siege_social,
    a.ville_siege_social,
    a.departement,
    a.is_active,
    a.created_at,
    -- Métiers associés
    COUNT(am.id) as nombre_metiers,
    STRING_AGG(DISTINCT m.label, ', ') as metiers,
    STRING_AGG(DISTINCT CASE WHEN am.is_primary = true THEN m.label END, ', ') as metier_principal
FROM artisans a
LEFT JOIN artisan_metiers am ON a.id = am.artisan_id
LEFT JOIN metiers m ON am.metier_id = m.id
WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY a.id, a.prenom, a.nom, a.telephone, a.email, a.raison_sociale, 
         a.siret, a.statut_id, a.gestionnaire_id, a.adresse_siege_social, 
         a.ville_siege_social, a.departement, a.is_active, a.created_at
ORDER BY a.created_at DESC
LIMIT 20;

-- 3. ARTISANS AVEC LEURS ZONES D'INTERVENTION
-- ==========================================
SELECT 
    a.id,
    a.prenom,
    a.nom,
    a.telephone,
    a.ville_siege_social,
    a.departement,
    -- Zones associées
    COUNT(az.id) as nombre_zones,
    STRING_AGG(DISTINCT z.label, ', ') as zones_intervention
FROM artisans a
LEFT JOIN artisan_zones az ON a.id = az.artisan_id
LEFT JOIN zones z ON az.zone_id = z.id
WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY a.id, a.prenom, a.nom, a.telephone, a.ville_siege_social, a.departement
ORDER BY a.created_at DESC
LIMIT 20;

-- 4. ARTISANS AVEC LEURS DOCUMENTS DRIVE
-- =====================================
SELECT 
    a.id,
    a.prenom,
    a.nom,
    a.telephone,
    a.email,
    -- Documents associés
    COUNT(aa.id) as nombre_documents,
    STRING_AGG(DISTINCT aa.filename, ' | ') as documents,
    STRING_AGG(DISTINCT aa.url, ' | ') as urls_documents
FROM artisans a
LEFT JOIN artisan_attachments aa ON a.id = aa.artisan_id
WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY a.id, a.prenom, a.nom, a.telephone, a.email
ORDER BY a.created_at DESC
LIMIT 20;

-- 5. DÉTAIL DES DOCUMENTS PAR ARTISAN
-- ==================================
SELECT 
    a.id as artisan_id,
    a.prenom,
    a.nom,
    aa.id as document_id,
    aa.kind,
    aa.filename,
    aa.url,
    aa.mime_type,
    aa.file_size,
    aa.created_at as document_created_at
FROM artisans a
INNER JOIN artisan_attachments aa ON a.id = aa.artisan_id
WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY a.created_at DESC, aa.created_at DESC
LIMIT 50;

-- 6. ARTISANS SANS MÉTIERS (À VÉRIFIER)
-- ====================================
SELECT 
    a.id,
    a.prenom,
    a.nom,
    a.telephone,
    a.email,
    a.raison_sociale,
    a.created_at
FROM artisans a
LEFT JOIN artisan_metiers am ON a.id = am.artisan_id
WHERE am.id IS NULL 
  AND a.created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY a.created_at DESC;

-- 7. ARTISANS SANS ZONES (À VÉRIFIER)
-- ==================================
SELECT 
    a.id,
    a.prenom,
    a.nom,
    a.telephone,
    a.ville_siege_social,
    a.departement,
    a.created_at
FROM artisans a
LEFT JOIN artisan_zones az ON a.id = az.artisan_id
WHERE az.id IS NULL 
  AND a.created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY a.created_at DESC;

-- 8. STATISTIQUES DES MÉTIERS ASSIGNÉS
-- ===================================
SELECT 
    m.label as metier,
    COUNT(am.id) as nombre_artisans,
    COUNT(CASE WHEN am.is_primary = true THEN 1 END) as artisans_principaux,
    COUNT(CASE WHEN am.is_primary = false THEN 1 END) as artisans_secondaires
FROM metiers m
INNER JOIN artisan_metiers am ON m.id = am.metier_id
INNER JOIN artisans a ON am.artisan_id = a.id
WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY m.id, m.label
ORDER BY nombre_artisans DESC;

-- 9. STATISTIQUES DES ZONES ASSIGNÉES
-- ==================================
SELECT 
    z.label as zone,
    COUNT(az.id) as nombre_artisans
FROM zones z
INNER JOIN artisan_zones az ON z.id = az.zone_id
INNER JOIN artisans a ON az.artisan_id = a.id
WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY z.id, z.label
ORDER BY nombre_artisans DESC;

-- 10. VÉRIFICATION DE L'INTÉGRITÉ DES DONNÉES ARTISANS
-- ===================================================
SELECT 
    'Artisans' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN prenom IS NOT NULL AND prenom != '' THEN 1 END) as avec_prenom,
    COUNT(CASE WHEN nom IS NOT NULL AND nom != '' THEN 1 END) as avec_nom,
    COUNT(CASE WHEN telephone IS NOT NULL AND telephone != '' THEN 1 END) as avec_telephone
FROM artisans
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'

UNION ALL

SELECT 
    'Métiers Artisans' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN artisan_id IS NOT NULL THEN 1 END) as avec_artisan_id,
    COUNT(CASE WHEN metier_id IS NOT NULL THEN 1 END) as avec_metier_id,
    COUNT(CASE WHEN is_primary = true THEN 1 END) as metiers_principaux
FROM artisan_metiers am
INNER JOIN artisans a ON am.artisan_id = a.id
WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days'

UNION ALL

SELECT 
    'Zones Artisans' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN artisan_id IS NOT NULL THEN 1 END) as avec_artisan_id,
    COUNT(CASE WHEN zone_id IS NOT NULL THEN 1 END) as avec_zone_id,
    0 as placeholder
FROM artisan_zones az
INNER JOIN artisans a ON az.artisan_id = a.id
WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days'

UNION ALL

SELECT 
    'Documents Artisans' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN artisan_id IS NOT NULL THEN 1 END) as avec_artisan_id,
    COUNT(CASE WHEN url IS NOT NULL AND url != '' THEN 1 END) as avec_url,
    COUNT(CASE WHEN filename IS NOT NULL AND filename != '' THEN 1 END) as avec_filename
FROM artisan_attachments aa
INNER JOIN artisans a ON aa.artisan_id = a.id
WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days';

-- 11. RECHERCHE D'ARTISANS SPÉCIFIQUES (EXEMPLE)
-- ==============================================
-- Remplacez les valeurs par vos données de test
SELECT 
    a.*,
    COUNT(am.id) as nombre_metiers,
    COUNT(az.id) as nombre_zones,
    COUNT(aa.id) as nombre_documents
FROM artisans a
LEFT JOIN artisan_metiers am ON a.id = am.artisan_id
LEFT JOIN artisan_zones az ON a.id = az.artisan_id
LEFT JOIN artisan_attachments aa ON a.id = aa.artisan_id
WHERE a.prenom ILIKE '%VOTRE_PRENOM%'     -- Remplacez par un prénom réel
   OR a.nom ILIKE '%VOTRE_NOM%'           -- Remplacez par un nom réel
   OR a.telephone ILIKE '%VOTRE_TEL%'     -- Remplacez par un téléphone réel
   OR a.ville_siege_social ILIKE '%VOTRE_VILLE%'  -- Remplacez par une ville réelle
GROUP BY a.id
ORDER BY a.created_at DESC;

-- 12. ARTISANS AVEC DOCUMENTS DRIVE (URLS GOOGLE DRIVE)
-- ====================================================
SELECT 
    a.id,
    a.prenom,
    a.nom,
    a.telephone,
    a.email,
    aa.filename,
    aa.url,
    CASE 
        WHEN aa.url LIKE 'https://drive.google.com/drive/folders/%' THEN 'Dossier Drive'
        WHEN aa.url LIKE 'https://drive.google.com/file/d/%' THEN 'Fichier Drive'
        ELSE 'Autre type'
    END as type_document
FROM artisans a
INNER JOIN artisan_attachments aa ON a.id = aa.artisan_id
WHERE aa.url LIKE 'https://drive.google.com%'
  AND a.created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY a.created_at DESC, aa.created_at DESC;
