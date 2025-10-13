-- =============================================
-- USER TEAMS VIEW - Elegant solution for RLS
-- =============================================

-- Drop old conflicting policies on team_members if they exist
DROP POLICY IF EXISTS "Users can view team members where they are owner" ON public.team_members;
DROP POLICY IF EXISTS "Users can view their own membership" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team members where they are members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team members where they own the team" ON public.team_members;
DROP POLICY IF EXISTS "Users can view their own team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can view all team members" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view other members on their teams" ON public.team_members;

-- Drop old conflicting policy on teams if it exists
DROP POLICY IF EXISTS "Members can view their teams" ON public.teams;

-- Create helper function to get user's team IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_team_ids()
RETURNS TABLE (team_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT tm.team_id
  FROM public.team_members tm
  WHERE tm.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_user_team_ids TO authenticated;

-- Simple team_members policies (no circular references)
CREATE POLICY "Users can view their own team memberships"
  ON public.team_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Team owners can view all team members"
  ON public.team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id
        AND teams.owner_id = auth.uid()
    )
  );

CREATE POLICY "Team members can view other members on their teams"
  ON public.team_members FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.get_user_team_ids()
    )
  );

-- Create view that joins teams with user's membership
CREATE OR REPLACE VIEW public.user_teams AS
SELECT
  t.id,
  t.name,
  t.description,
  t.avatar_url,
  t.owner_id,
  t.created_at,
  t.updated_at,
  tm.role as user_role
FROM public.teams t
INNER JOIN public.team_members tm ON t.id = tm.team_id
WHERE tm.user_id = auth.uid();

-- Grant access to authenticated users
GRANT SELECT ON public.user_teams TO authenticated;

-- Create function to get user teams (replaces the complex frontend query)
CREATE OR REPLACE FUNCTION public.get_user_teams()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  avatar_url TEXT,
  owner_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.description,
    t.avatar_url,
    t.owner_id,
    t.created_at,
    t.updated_at,
    tm.role
  FROM public.teams t
  INNER JOIN public.team_members tm ON t.id = tm.team_id
  WHERE tm.user_id = auth.uid()
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_teams TO authenticated;
