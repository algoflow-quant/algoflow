-- =============================================
-- AVATAR STORAGE
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload their own avatars or team avatars they own
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND (
    -- User's own avatar
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Team avatar (user is team owner)
    (
      (storage.foldername(name))[1] = 'teams' AND
      (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.teams WHERE owner_id = auth.uid()
      )
    )
  )
);

-- Policy: Users can update their own avatars or team avatars they own
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND (
    -- User's own avatar
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Team avatar (user is team owner)
    (
      (storage.foldername(name))[1] = 'teams' AND
      (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.teams WHERE owner_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  bucket_id = 'avatars' AND (
    -- User's own avatar
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Team avatar (user is team owner)
    (
      (storage.foldername(name))[1] = 'teams' AND
      (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.teams WHERE owner_id = auth.uid()
      )
    )
  )
);

-- Policy: Users can delete their own avatars or team avatars they own
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND (
    -- User's own avatar
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Team avatar (user is team owner)
    (
      (storage.foldername(name))[1] = 'teams' AND
      (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.teams WHERE owner_id = auth.uid()
      )
    )
  )
);

-- Policy: Anyone can view avatars (public bucket)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
