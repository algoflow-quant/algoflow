-- =============================================
-- ENABLE REALTIME REPLICATION
-- =============================================

-- Enable realtime for teams table
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;

-- Enable realtime for team_members table
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;

-- Enable realtime for projects table
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;

-- Enable realtime for profiles table (for avatar updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Enable realtime for project_files table (for file sync)
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_files;

-- =============================================
-- CONFIGURE REPLICA IDENTITY FOR DELETE EVENTS
-- =============================================
-- By default, DELETE events only include the primary key.
-- Set FULL replica identity to include all columns in DELETE payloads.

-- Include user_id and team_id in team_members DELETE events
ALTER TABLE public.team_members REPLICA IDENTITY FULL;

-- Include team_id in projects DELETE events
ALTER TABLE public.projects REPLICA IDENTITY FULL;

-- Include project_id in project_files DELETE events
ALTER TABLE public.project_files REPLICA IDENTITY FULL;
