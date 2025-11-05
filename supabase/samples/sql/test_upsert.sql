-- ===== TEST UPSERT FUNCTIONALITY =====
-- Requêtes pour tester la fonctionnalité d'upsert

-- 1. Vérifier les emails problématiques avant upsert
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

-- 2. Compter les artisans avec ces emails
SELECT 
  email,
  COUNT(*) as count
FROM artisans 
WHERE email IN (
  'contact@athermik.fr',
  'securite.serrure@gmail.com',
  'sebastienpapon@hotmail.fr'
)
GROUP BY email;

-- 3. Vérifier après l'import avec upsert
-- (Exécuter après avoir lancé l'import avec --upsert)
SELECT 
  id,
  prenom,
  nom,
  email,
  telephone,
  updated_at,
  created_at
FROM artisans 
WHERE email IN (
  'contact@athermik.fr',
  'securite.serrure@gmail.com',
  'sebastienpapon@hotmail.fr'
)
ORDER BY updated_at DESC;

-- 4. Vérifier les métiers et zones après upsert
SELECT 
  a.id,
  a.prenom,
  a.nom,
  a.email,
  STRING_AGG(m.label, ', ') as metiers,
  STRING_AGG(z.label, ', ') as zones
FROM artisans a
LEFT JOIN artisan_metiers am ON a.id = am.artisan_id
LEFT JOIN metiers m ON am.metier_id = m.id
LEFT JOIN artisan_zones az ON a.id = az.artisan_id
LEFT JOIN zones z ON az.zone_id = z.id
WHERE a.email IN (
  'contact@athermik.fr',
  'securite.serrure@gmail.com',
  'sebastienpapon@hotmail.fr'
)
GROUP BY a.id, a.prenom, a.nom, a.email;
