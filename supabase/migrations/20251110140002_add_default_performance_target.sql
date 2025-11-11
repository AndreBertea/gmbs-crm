-- Migration: Ajouter la valeur par défaut pour performance_target
-- Objectif: Définir 40% comme valeur par défaut pour l'objectif de performance
-- Date: 2025-01-20

-- Modifier la colonne performance_target pour ajouter une valeur par défaut de 40%
ALTER TABLE public.gestionnaire_targets 
  ALTER COLUMN performance_target SET DEFAULT 40.00;

-- Mettre à jour les enregistrements existants qui ont performance_target NULL pour leur donner 40%
UPDATE public.gestionnaire_targets 
SET performance_target = 40.00 
WHERE performance_target IS NULL;

-- Mettre à jour le commentaire
COMMENT ON COLUMN public.gestionnaire_targets.performance_target IS 'Objectif de performance en pourcentage (défaut: 40%)';

