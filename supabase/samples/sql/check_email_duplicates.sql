-- ===== VÉRIFIER LES DOUBLONS D'EMAILS =====

-- 1. Trouver les emails en double
SELECT 
  email,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as artisan_ids,
  STRING_AGG(CONCAT(prenom, ' ', nom), ', ') as artisan_names
FROM artisans 
WHERE email IS NOT NULL 
GROUP BY email 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 2. Vérifier s'il y a des emails vides ou NULL
SELECT 
  CASE 
    WHEN email IS NULL THEN 'NULL'
    WHEN email = '' THEN 'Empty'
    ELSE 'Has email'
  END as email_status,
  COUNT(*) as count
FROM artisans 
GROUP BY 
  CASE 
    WHEN email IS NULL THEN 'NULL'
    WHEN email = '' THEN 'Empty'
    ELSE 'Has email'
  END;

-- 3. Lister tous les emails (pour vérification manuelle)
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

-- 4. Vérifier les emails problématiques spécifiques
SELECT 
  id,
  prenom,
  nom,
  email,
  telephone,
  created_at
FROM artisans 
WHERE email IN (
  'contact@athermik.fr',
  'securite.serrure@gmail.com',
  'sebastienpapon@hotmail.fr'
);
