-- ===== ÉCHANTILLONS D'ARTISANS =====

-- 1. 10 premiers artisans (ordre alphabétique)
SELECT 
  id,
  prenom,
  nom,
  email,
  telephone,
  raison_sociale,
  siret,
  
  is_active,
  created_at
FROM artisans 
ORDER BY nom, prenom 
LIMIT 10;

-- 2. 10 derniers artisans créés
SELECT 
  id,
  prenom,
  nom,
  email,
  telephone,
  is_active,
  created_at
FROM artisans 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Artisans avec email (pour vérifier les doublons)
SELECT 
  id,
  prenom,
  nom,
  email,
  telephone,
  created_at
FROM artisans 
WHERE email IS NOT NULL 
ORDER BY email;

-- 4. Artisans par département
SELECT 
  departement,
  COUNT(*) as count
FROM artisans 
WHERE departement IS NOT NULL
GROUP BY departement 
ORDER BY count DESC 
LIMIT 10;

-- 5. Rechercher par téléphone
SELECT 
  id,
  prenom,
  nom,
  email,
  telephone,
  telephone2
FROM artisans 
WHERE telephone LIKE '%69%' 
   OR telephone2 LIKE '%69%';
