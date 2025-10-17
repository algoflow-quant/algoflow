-- Create storage bucket for project files
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', false);

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view files in their team's projects
CREATE POLICY "Users can view project files from their teams"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-files' AND
  EXISTS (
    SELECT 1 FROM projects p
    INNER JOIN team_members tm ON tm.team_id = p.team_id
    WHERE (storage.foldername(objects.name))[1] = p.id::text
    AND tm.user_id = auth.uid()
  )
);

-- Policy: Users can upload files to their team's projects
CREATE POLICY "Users can upload project files to their teams"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-files' AND
  EXISTS (
    SELECT 1 FROM projects p
    INNER JOIN team_members tm ON tm.team_id = p.team_id
    WHERE (storage.foldername(objects.name))[1] = p.id::text
    AND tm.user_id = auth.uid()
  )
);

-- Policy: Users can update files in their team's projects
CREATE POLICY "Users can update project files in their teams"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'project-files' AND
  EXISTS (
    SELECT 1 FROM projects p
    INNER JOIN team_members tm ON tm.team_id = p.team_id
    WHERE (storage.foldername(objects.name))[1] = p.id::text
    AND tm.user_id = auth.uid()
  )
);

-- Policy: Users can delete files in their team's projects
CREATE POLICY "Users can delete project files from their teams"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-files' AND
  EXISTS (
    SELECT 1 FROM projects p
    INNER JOIN team_members tm ON tm.team_id = p.team_id
    WHERE (storage.foldername(objects.name))[1] = p.id::text
    AND tm.user_id = auth.uid()
  )
);
