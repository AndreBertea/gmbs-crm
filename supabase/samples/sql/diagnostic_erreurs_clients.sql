-- ========================================
-- DIAGNOSTIC DES ERREURS CLIENTS
-- ========================================
-- Script pour analyser les erreurs d'insertion de clients

-- 1. Vérifier les clients récents
SELECT 
    'CLIENTS RÉCENTS' as analyse,
    COUNT(*) as total_clients,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as clients_7_jours
FROM clients;

-- 2. Analyser les clients par source
SELECT 
    'CLIENTS PAR SOURCE' as analyse,
    CASE 
        WHEN external_ref IS NOT NULL THEN 'Avec référence externe'
        ELSE 'Sans référence externe'
    END as type_client,
    COUNT(*) as nombre,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as recents_7_jours
FROM clients
GROUP BY CASE 
    WHEN external_ref IS NOT NULL THEN 'Avec référence externe'
    ELSE 'Sans référence externe'
END;

-- 3. Vérifier les clients avec emails dupliqués
SELECT 
    'CLIENTS EMAILS DUPLIQUÉS' as analyse,
    email,
    COUNT(*) as nombre_duplicates,
    STRING_AGG(id::text, ', ') as ids_clients
FROM clients
WHERE email IS NOT NULL AND email != ''
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY nombre_duplicates DESC
LIMIT 10;

-- 4. Vérifier les clients avec téléphones dupliqués
SELECT 
    'CLIENTS TÉLÉPHONES DUPLIQUÉS' as analyse,
    telephone,
    COUNT(*) as nombre_duplicates,
    STRING_AGG(id::text, ', ') as ids_clients
FROM clients
WHERE telephone IS NOT NULL AND telephone != ''
GROUP BY telephone
HAVING COUNT(*) > 1
ORDER BY nombre_duplicates DESC
LIMIT 10;

-- 5. Analyser les clients sans informations essentielles
SELECT 
    'CLIENTS INCOMPLETS' as analyse,
    COUNT(CASE WHEN firstname IS NULL OR firstname = '' THEN 1 END) as sans_prenom,
    COUNT(CASE WHEN lastname IS NULL OR lastname = '' THEN 1 END) as sans_nom,
    COUNT(CASE WHEN email IS NULL OR email = '' THEN 1 END) as sans_email,
    COUNT(CASE WHEN telephone IS NULL OR telephone = '' THEN 1 END) as sans_telephone,
    COUNT(CASE WHEN (firstname IS NULL OR firstname = '') AND (lastname IS NULL OR lastname = '') THEN 1 END) as sans_nom_complet
FROM clients
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';

-- 6. Vérifier les contraintes de la table clients
SELECT 
    'CONTRAINTES TABLE CLIENTS' as analyse,
    conname as nom_contrainte,
    contype as type_contrainte,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'clients'::regclass
ORDER BY conname;

-- 7. Résumé des erreurs potentielles
SELECT 
    'RÉSUMÉ ERREURS POTENTIELLES' as analyse,
    COUNT(*) as total_clients,
    COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as avec_email,
    COUNT(CASE WHEN telephone IS NOT NULL AND telephone != '' THEN 1 END) as avec_telephone,
    COUNT(CASE WHEN external_ref IS NOT NULL THEN 1 END) as avec_ref_externe,
    COUNT(CASE WHEN (firstname IS NULL OR firstname = '') AND (lastname IS NULL OR lastname = '') THEN 1 END) as sans_nom_complet
FROM clients
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';
