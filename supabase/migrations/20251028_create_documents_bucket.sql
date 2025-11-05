-- ========================================
-- Création du bucket pour les documents
-- ========================================

-- Créer le bucket 'documents' s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  52428800, -- 50 MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Politique pour permettre la lecture publique des documents
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public documents read access'
  ) THEN
    CREATE POLICY "Public documents read access"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'documents');
  END IF;
END $$;

-- Politique pour permettre l'upload des documents (authentifié)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload documents'
  ) THEN
    CREATE POLICY "Authenticated users can upload documents"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'documents' 
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;

-- Politique pour permettre la suppression des documents (authentifié)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can delete documents'
  ) THEN
    CREATE POLICY "Authenticated users can delete documents"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'documents' 
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;

-- Politique pour permettre la mise à jour des documents (authentifié)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can update documents'
  ) THEN
    CREATE POLICY "Authenticated users can update documents"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'documents' 
        AND auth.role() = 'authenticated'
      )
      WITH CHECK (
        bucket_id = 'documents' 
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;

