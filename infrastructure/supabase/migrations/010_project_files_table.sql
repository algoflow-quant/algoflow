-- =============================================
-- PROJECT FILES TABLE FOR REALTIME SYNC
-- =============================================
-- Create table to track project files for realtime sync
-- This complements the storage bucket by providing realtime events

CREATE TABLE IF NOT EXISTS public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL, -- Full path in storage: projectId/fileName
  size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, path)
);

-- Create index for faster queries
CREATE INDEX idx_project_files_project_id ON public.project_files(project_id);
CREATE INDEX idx_project_files_created_by ON public.project_files(created_by);

-- Enable RLS
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view files in their team's projects
CREATE POLICY "Users can view project files from their teams"
ON public.project_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    INNER JOIN team_members tm ON tm.team_id = p.team_id
    WHERE p.id = project_files.project_id
    AND tm.user_id = auth.uid()
  )
);

-- Policy: Users can insert files to their team's projects
CREATE POLICY "Users can insert project files to their teams"
ON public.project_files FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    INNER JOIN team_members tm ON tm.team_id = p.team_id
    WHERE p.id = project_files.project_id
    AND tm.user_id = auth.uid()
  )
);

-- Policy: Users can update files in their team's projects
CREATE POLICY "Users can update project files in their teams"
ON public.project_files FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    INNER JOIN team_members tm ON tm.team_id = p.team_id
    WHERE p.id = project_files.project_id
    AND tm.user_id = auth.uid()
  )
);

-- Policy: Users can delete files from their team's projects
CREATE POLICY "Users can delete project files from their teams"
ON public.project_files FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    INNER JOIN team_members tm ON tm.team_id = p.team_id
    WHERE p.id = project_files.project_id
    AND tm.user_id = auth.uid()
  )
);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on UPDATE
CREATE TRIGGER update_project_files_updated_at_trigger
BEFORE UPDATE ON public.project_files
FOR EACH ROW
EXECUTE FUNCTION update_project_files_updated_at();
