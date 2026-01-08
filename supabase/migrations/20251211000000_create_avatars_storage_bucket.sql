-- Create avatars storage bucket for profile images
-- This migration sets up Supabase Storage for avatar uploads
--
-- IDEMPOTENT: This migration is safe to run multiple times
-- CI-SAFE: Gracefully handles missing storage extensions

-- Check if this is a Supabase environment (has storage schema)
DO $$
BEGIN
  -- Only create storage buckets if storage schema exists
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    
    -- Create the avatars bucket (public access for reading)
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'avatars',
      'avatars',
      true, -- Public bucket for avatar images
      5242880, -- 5MB file size limit
      ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    )
    ON CONFLICT (id) DO NOTHING;

    -- Allow public read access to avatar images
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'objects' 
      AND policyname = 'Avatar images are publicly accessible'
    ) THEN
      CREATE POLICY "Avatar images are publicly accessible"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars');
    END IF;

    -- Allow authenticated users to upload their own avatar
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'objects' 
      AND policyname = 'Users can upload their own avatar'
    ) THEN
      CREATE POLICY "Users can upload their own avatar"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
    END IF;

    -- Allow users to update their own avatar
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'objects' 
      AND policyname = 'Users can update their own avatar'
    ) THEN
      CREATE POLICY "Users can update their own avatar"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
    END IF;

    -- Allow users to delete their own avatar
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'objects' 
      AND policyname = 'Users can delete their own avatar'
    ) THEN
      CREATE POLICY "Users can delete their own avatar"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
    END IF;

    RAISE NOTICE 'Supabase Storage: Created avatars bucket and policies';
  ELSE
    RAISE NOTICE 'Supabase Storage: Skipping bucket creation (storage schema not found)';
  END IF;
END
$$;
