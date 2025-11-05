-- ===== RECHERCHER UN ARTISAN PAR EMAIL =====

-- 1. Rechercher par email exact
SELECT 
  id,
  prenom,
  nom,
  email,
  telephone,
  telephone2,
  raison_sociale,
  siret,
  statut_juridique,
  adresse_siege_social,
  ville_siege_social,
  code_postal_siege_social,
  is_active,
  created_at,
  updated_at
FROM artisans 
WHERE email = 'contact@athermik.fr';

-- 2. Rechercher par email partiel (LIKE)
SELECT 
  id,
  prenom,
  nom,
  email,
  telephone
FROM artisans 
WHERE email LIKE '%athermik%';

-- 3. Rechercher plusieurs emails spécifiques
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

-- 4. Rechercher par nom ou prénom
SELECT 
  id,
  prenom,
  nom,
  email,
  telephone
FROM artisans 
WHERE 
  LOWER(CONCAT(prenom, ' ', nom)) LIKE '%karrad%' 
  OR LOWER(CONCAT(prenom, ' ', nom)) LIKE '%ahmed%';
