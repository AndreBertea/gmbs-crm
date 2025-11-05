-- ===== DEBUG IMPORT ERRORS =====
-- Requêtes pour diagnostiquer les erreurs d'import

-- 1. Vérifier les emails problématiques de l'import
SELECT 
  id,
  prenom,
  nom,
  email,
  telephone,
  telephone2,
  raison_sociale,
  is_active,
  created_at
FROM artisans 
WHERE email IN (
  'contact@athermik.fr',
  'securite.serrure@gmail.com',
  'sebastienpapon@hotmail.fr'
);

-- 2. Compter les artisans par statut
SELECT 
  COUNT(*) as total_artisans,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as with_email,
  COUNT(CASE WHEN telephone IS NOT NULL THEN 1 END) as with_phone
FROM artisans;

-- 3. Vérifier les contraintes uniques
-- Cette requête montrera s'il y a des violations de contraintes
SELECT 
  email,
  COUNT(*) as count
FROM artisans 
WHERE email IS NOT NULL 
GROUP BY email 
HAVING COUNT(*) > 1;

-- 4. Lister les derniers artisans créés (pour voir si l'import fonctionne partiellement)
SELECT 
  id,
  prenom,
  nom,
  email,
  telephone,
  created_at
FROM artisans 
ORDER BY created_at DESC 
LIMIT 20;

-- 5. Vérifier les artisans avec des noms similaires à ceux de l'import
SELECT 
  id,
  prenom,
  nom,
  email,
  telephone,
  created_at
FROM artisans 
WHERE 
  LOWER(CONCAT(prenom, ' ', nom)) LIKE '%karrad%' 
  OR LOWER(CONCAT(prenom, ' ', nom)) LIKE '%ahmed%'
  OR LOWER(CONCAT(prenom, ' ', nom)) LIKE '%nourredine%'
  OR LOWER(CONCAT(prenom, ' ', nom)) LIKE '%sebastien%'
  OR LOWER(CONCAT(prenom, ' ', nom)) LIKE '%papon%';
