-- Create storage bucket for user avatars
-- 
-- RLS is disabled because:
-- 1. Server actions use service role key (bypasses RLS)
-- 2. ABAC policies handle authorization in application layer
-- 3. Bucket is public for read access (displaying avatars)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true, -- Public bucket so avatars are accessible
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- No RLS policies needed
-- Access control is handled by:
-- 1. ProfileRepository uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)
-- 2. ABAC policies check 'update' permission on 'profile' resource
-- 3. Public bucket allows read access for displaying avatars
