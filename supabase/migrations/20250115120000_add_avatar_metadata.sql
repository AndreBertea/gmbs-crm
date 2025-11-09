-- ========================================
-- Ajout des métadonnées pour les photos de profil (avatars)
-- ========================================

-- Vérifier que la table existe avant de la modifier
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'artisan_attachments') THEN
    -- Ajouter les colonnes pour stocker les métadonnées des avatars
    ALTER TABLE public.artisan_attachments
    ADD COLUMN IF NOT EXISTS content_hash TEXT,
    ADD COLUMN IF NOT EXISTS derived_sizes JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS mime_preferred TEXT;

    -- Ajouter un index sur content_hash pour les recherches rapides
    CREATE INDEX IF NOT EXISTS idx_artisan_attachments_content_hash 
    ON public.artisan_attachments(content_hash) 
    WHERE content_hash IS NOT NULL;

    -- Ajouter un index sur kind pour les recherches de photo_profil
    CREATE INDEX IF NOT EXISTS idx_artisan_attachments_kind 
    ON public.artisan_attachments(kind) 
    WHERE kind = 'photo_profil';

    -- Commentaires pour documentation
    COMMENT ON COLUMN public.artisan_attachments.content_hash IS 'Hash SHA-256 du contenu de l''image pour déduplication et versioning';
    COMMENT ON COLUMN public.artisan_attachments.derived_sizes IS 'URLs des dérivés générés : {"40": "url", "80": "url", "160": "url"}';
    COMMENT ON COLUMN public.artisan_attachments.mime_preferred IS 'Format MIME préféré pour l''affichage (image/webp ou image/jpeg)';
  END IF;
END $$;

