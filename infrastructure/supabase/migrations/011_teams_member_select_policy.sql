-- =============================================
-- TEAMS TABLE - Add policy for members to view their teams
-- =============================================
-- Allow team members to view teams they belong to (not just owners)
-- Uses the SECURITY DEFINER function to avoid circular RLS

CREATE POLICY "Team members can view their teams"
  ON public.teams FOR SELECT
  USING (
    id IN (
      SELECT team_id FROM public.get_user_team_ids()
    )
  );
