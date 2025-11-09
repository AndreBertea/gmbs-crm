-- Migration: Mise à jour des kinds de documents pour interventions et artisans
-- Date: 2025-01-15
-- Description: 
--   - Ajout des nouveaux kinds: 'autre' et 'a_classe' pour interventions
--   - Mise à jour des kinds pour artisans: ajout de 'photo_profil' et 'a_classe'
--   - Retrait des kinds obsolètes

-- ========================================
-- 1. INTERVENTIONS - Mise à jour contrainte CHECK
-- ========================================

-- Vérifier que la table existe avant de modifier la contrainte
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'intervention_attachments') THEN
    -- Supprimer l'ancienne contrainte
    ALTER TABLE public.intervention_attachments 
    DROP CONSTRAINT IF EXISTS intervention_attachments_kind_check;

    -- Ajouter la nouvelle contrainte avec les kinds mis à jour
    ALTER TABLE public.intervention_attachments 
    ADD CONSTRAINT intervention_attachments_kind_check 
    CHECK (kind IN (
      'devis',
      'photos',
      'facturesGMBS',
      'facturesArtisans',
      'facturesMateriel',
      'autre',
      'a_classe'
    ));

    -- Commentaire sur la contrainte
    COMMENT ON CONSTRAINT intervention_attachments_kind_check ON public.intervention_attachments 
    IS 'Contraint les kinds de documents pour les interventions. Nouveaux kinds: autre, a_classe. Format factures avec s.';
  END IF;
END $$;

-- ========================================
-- 2. ARTISANS - Ajout contrainte CHECK (optionnel mais recommandé)
-- ========================================

-- Vérifier que la table existe avant de modifier la contrainte
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'artisan_attachments') THEN
    -- Supprimer l'ancienne contrainte si elle existe
    ALTER TABLE public.artisan_attachments 
    DROP CONSTRAINT IF EXISTS artisan_attachments_kind_check;

    -- Ajouter la nouvelle contrainte avec les kinds mis à jour
    ALTER TABLE public.artisan_attachments 
    ADD CONSTRAINT artisan_attachments_kind_check 
    CHECK (kind IN (
      'kbis',
      'assurance',
      'cni_recto_verso',
      'iban',
      'decharge_partenariat',
      'photo_profil',
      'autre',
      'a_classe'
    ));

    -- Commentaire sur la contrainte
    COMMENT ON CONSTRAINT artisan_attachments_kind_check ON public.artisan_attachments 
    IS 'Contraint les kinds de documents pour les artisans. Nouveaux kinds: photo_profil, a_classe.';
  END IF;
END $$;

-- ========================================
-- 3. Migration des données existantes (si nécessaire)
-- ========================================

-- Migrer les anciens kinds d'interventions vers les nouveaux formats
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'intervention_attachments') THEN
    -- factureGMBS -> facturesGMBS
    UPDATE public.intervention_attachments 
    SET kind = 'facturesGMBS' 
    WHERE kind = 'factureGMBS';

    -- factureArtisan -> facturesArtisans
    UPDATE public.intervention_attachments 
    SET kind = 'facturesArtisans' 
    WHERE kind = 'factureArtisan';

    -- factureMateriel -> facturesMateriel
    UPDATE public.intervention_attachments 
    SET kind = 'facturesMateriel' 
    WHERE kind = 'factureMateriel';

    -- Migrer les anciens kinds obsolètes vers 'autre' ou 'a_classe'
    -- intervention -> autre (ou a_classe selon contexte)
    UPDATE public.intervention_attachments 
    SET kind = 'autre' 
    WHERE kind = 'intervention';

    -- cout -> autre
    UPDATE public.intervention_attachments 
    SET kind = 'autre' 
    WHERE kind = 'cout';

    -- rapport_intervention -> autre
    UPDATE public.intervention_attachments 
    SET kind = 'autre' 
    WHERE kind = 'rapport_intervention';

    -- plan -> autre
    UPDATE public.intervention_attachments 
    SET kind = 'autre' 
    WHERE kind = 'plan';

    -- schema -> autre
    UPDATE public.intervention_attachments 
    SET kind = 'autre' 
    WHERE kind = 'schema';
  END IF;
END $$;

-- Pour les artisans, migrer les anciens kinds obsolètes vers 'autre'
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'artisan_attachments') THEN
    -- certificat -> autre
    UPDATE public.artisan_attachments 
    SET kind = 'autre' 
    WHERE kind = 'certificat';

    -- siret -> autre
    UPDATE public.artisan_attachments 
    SET kind = 'autre' 
    WHERE kind = 'siret';

    -- portfolio -> autre
    UPDATE public.artisan_attachments 
    SET kind = 'autre' 
    WHERE kind = 'portfolio';
  END IF;
END $$;

-- ========================================
-- 4. Vérification des données migrées (commenté pour éviter les erreurs lors du reset)
-- ========================================

-- Ces requêtes sont commentées car elles peuvent échouer si les tables sont vides
-- Vous pouvez les exécuter manuellement après la migration pour vérifier les données

-- -- Compter les documents par kind pour interventions
-- SELECT kind, COUNT(*) as count 
-- FROM public.intervention_attachments 
-- GROUP BY kind 
-- ORDER BY count DESC;

-- -- Compter les documents par kind pour artisans
-- SELECT kind, COUNT(*) as count 
-- FROM public.artisan_attachments 
-- GROUP BY kind 
-- ORDER BY count DESC;

