-- ===== DEBUG EMAILS ARTISANS =====
-- Vérifier les emails des artisans avant l'import

-- 1. Compter les artisans avec/sans email
SELECT 
  CASE 
    WHEN email IS NULL THEN 'Pas d\'email'
    WHEN email = '' THEN 'Email vide'
    ELSE 'A un email'
  END as email_status,
  COUNT(*) as count
FROM artisans 
GROUP BY 
  CASE 
    WHEN email IS NULL THEN 'Pas d\'email'
    WHEN email = '' THEN 'Email vide'
    ELSE 'A un email'
  END;

-- 2. Lister les artisans sans email
SELECT 
  id,
  prenom,
  nom,
  email,
  telephone,
  created_at
FROM artisans 
WHERE email IS NULL OR email = ''
ORDER BY created_at DESC
LIMIT 20;

-- 3. Lister les artisans avec email (pour vérifier les doublons)
SELECT 
  id,
  prenom,
  nom,
  email,
  telephone,
  created_at
FROM artisans 
WHERE email IS NOT NULL AND email != ''
ORDER BY email
LIMIT 20;

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
