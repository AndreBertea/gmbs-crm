-- ============================================
-- Nettoyage des utilisateurs dupliqués (gestionnaires)
-- ============================================
-- Ce script identifie les utilisateurs créés par erreur lors des imports
-- (ex: usernames réduits à une ou deux lettres) et propose leur remapping.
-- ============================================
-- Date: 2025-10-24
-- Author: Codex (IA)
-- ============================================

-- 1. Lister les utilisateurs suspects
SELECT
  id,
  username,
  email,
  code_gestionnaire
FROM users
WHERE LENGTH(username) <= 2
  AND username ~ '^[A-Z]+$';

-- 2. Exemple de remapping: adapter manuellement selon les résultats.
--    Remplacer <SOURCE_ID> par l'UUID du mauvais utilisateur
--    et <TARGET_USERNAME> par le username canonique (ex: 'badr').

-- UPDATE interventions
-- SET assigned_user_id = (
--   SELECT id FROM users WHERE username = '<TARGET_USERNAME>'
-- )
-- WHERE assigned_user_id = '<SOURCE_ID>';

-- 3. Supprimer les utilisateurs résiduels qui ne sont plus utilisés
DELETE FROM users
WHERE LENGTH(username) <= 2
  AND username ~ '^[A-Z]+$'
  AND id NOT IN (
    SELECT DISTINCT assigned_user_id
    FROM interventions
    WHERE assigned_user_id IS NOT NULL
  );

-- ============================================
-- Fin du script
-- ============================================
