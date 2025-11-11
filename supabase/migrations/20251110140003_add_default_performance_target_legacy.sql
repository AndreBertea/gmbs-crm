-- Migration: Ajouter la valeur par défaut pour performance_target (legacy)
-- Objectif: Définir 40% comme valeur par défaut pour l'objectif de performance
-- Date: 2025-11-10
-- Note: Cette migration remplace 20250120000001_add_default_performance_target.sql
--       qui s'exécutait avant la création de la table

-- Vérifier que la table existe avant de modifier la colonne
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gestionnaire_targets') THEN
    -- Modifier la colonne performance_target pour ajouter une valeur par défaut de 40%
    ALTER TABLE public.gestionnaire_targets 
      ALTER COLUMN performance_target SET DEFAULT 40.00;

    -- Mettre à jour les enregistrements existants qui ont performance_target NULL pour leur donner 40%
    UPDATE public.gestionnaire_targets 
    SET performance_target = 40.00 
    WHERE performance_target IS NULL;

    -- Mettre à jour le commentaire
    COMMENT ON COLUMN public.gestionnaire_targets.performance_target IS 'Objectif de performance en pourcentage (défaut: 40%)';
  END IF;
END $$;

