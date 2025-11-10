-- Ajouter "a classifier" aux valeurs autorisées pour intervention_attachments.kind
-- Cela permet d'importer des documents non classifiés depuis Google Drive
-- Migration créée après 20251005_clean_schema.sql pour s'assurer que la table existe

-- Trouver et supprimer la contrainte CHECK existante sur kind
DO $$ 
DECLARE
  constraint_name text;
BEGIN
  -- Trouver le nom de la contrainte CHECK sur kind
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'intervention_attachments'
    AND tc.constraint_type = 'CHECK'
    AND ccu.column_name = 'kind'
  LIMIT 1;
  
  -- Supprimer la contrainte si elle existe
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.intervention_attachments DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END $$;

-- Ajouter la nouvelle contrainte avec "a classifier"
ALTER TABLE public.intervention_attachments
ADD CONSTRAINT intervention_attachments_kind_check 
CHECK (kind IN (
  'intervention',
  'cout',
  'devis',
  'photos',
  'factureGMBS',
  'factureArtisan',
  'factureMateriel',
  'a classifier'
));

