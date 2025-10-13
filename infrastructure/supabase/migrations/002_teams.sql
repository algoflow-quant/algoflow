-- =============================================
-- TEAMS & TEAM MEMBERS
-- =============================================

-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Teams policies (simple, no recursion)
CREATE POLICY "Users can view teams they own"
  ON public.teams FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can update teams"
  ON public.teams FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete teams"
  ON public.teams FOR DELETE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Team members policies will be created in migration 006

CREATE POLICY "Owners can add members"
  ON public.team_members FOR INSERT
  WITH CHECK (
    team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid())
  );

CREATE POLICY "Owners can remove members"
  ON public.team_members FOR DELETE
  USING (
    team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid())
  );

-- Trigger to auto-update updated_at
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-add owner as team member
CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_team_created ON public.teams;
CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_team();

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);

-- Allow users to view profiles of people in their teams
-- Using EXISTS to avoid recursion issues
CREATE POLICY "Users can view team members profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.team_members tm1
      INNER JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = auth.uid()
        AND tm2.user_id = profiles.id
    )
  );

-- Backfill: Add existing team owners as team members
INSERT INTO public.team_members (team_id, user_id, role)
SELECT t.id, t.owner_id, 'owner'
FROM public.teams t
WHERE NOT EXISTS (
  SELECT 1 FROM public.team_members tm
  WHERE tm.team_id = t.id AND tm.user_id = t.owner_id
)
ON CONFLICT (team_id, user_id) DO NOTHING;
