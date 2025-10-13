-- =============================================
-- TEAM INVITATIONS
-- =============================================

-- Team invitations table
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, invitee_id)
);

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Team invitations policies
CREATE POLICY "Users can view invitations sent to them"
  ON public.team_invitations FOR SELECT
  USING (invitee_id = auth.uid());

CREATE POLICY "Team owners can view team invitations"
  ON public.team_invitations FOR SELECT
  USING (
    team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid())
  );

CREATE POLICY "Team owners can create invitations"
  ON public.team_invitations FOR INSERT
  WITH CHECK (
    inviter_id = auth.uid() AND
    team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid())
  );

CREATE POLICY "Invitees can update their invitation status"
  ON public.team_invitations FOR UPDATE
  USING (invitee_id = auth.uid());

-- Function to accept team invitation
CREATE OR REPLACE FUNCTION public.accept_team_invitation(invitation_id UUID)
RETURNS void AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM public.team_invitations
  WHERE id = invitation_id AND invitee_id = auth.uid() AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already processed';
  END IF;

  -- Add user to team
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_invitation.team_id, auth.uid(), 'member')
  ON CONFLICT (team_id, user_id) DO NOTHING;

  -- Update invitation status
  UPDATE public.team_invitations
  SET status = 'accepted', updated_at = NOW()
  WHERE id = invitation_id;

  -- Send notification to inviter
  PERFORM public.create_notification(
    v_invitation.inviter_id,
    'Invitation Accepted',
    'Your team invitation was accepted',
    'success',
    '/lab/' || v_invitation.team_id::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decline team invitation
CREATE OR REPLACE FUNCTION public.decline_team_invitation(invitation_id UUID)
RETURNS void AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM public.team_invitations
  WHERE id = invitation_id AND invitee_id = auth.uid() AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already processed';
  END IF;

  -- Update invitation status
  UPDATE public.team_invitations
  SET status = 'declined', updated_at = NOW()
  WHERE id = invitation_id;

  -- Send notification to inviter
  PERFORM public.create_notification(
    v_invitation.inviter_id,
    'Invitation Declined',
    'Your team invitation was declined',
    'info',
    '/lab/' || v_invitation.team_id::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON public.team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_invitee_id ON public.team_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON public.team_invitations(status);

-- Trigger to update updated_at
CREATE TRIGGER update_team_invitations_updated_at
  BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create team invitation
CREATE OR REPLACE FUNCTION public.create_team_invitation(
  p_team_id UUID,
  p_team_name TEXT,
  p_identifier TEXT,
  p_identifier_type TEXT
)
RETURNS UUID AS $$
DECLARE
  v_invitee_id UUID;
  v_invitation_id UUID;
BEGIN
  -- Check if caller is team owner
  IF NOT EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = p_team_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only team owners can send invitations';
  END IF;

  -- Find user by email or username
  IF p_identifier_type = 'email' THEN
    SELECT id INTO v_invitee_id
    FROM public.profiles
    WHERE email = p_identifier;
  ELSIF p_identifier_type = 'username' THEN
    SELECT id INTO v_invitee_id
    FROM public.profiles
    WHERE username = p_identifier;
  ELSE
    RAISE EXCEPTION 'Invalid identifier type';
  END IF;

  IF v_invitee_id IS NULL THEN
    RAISE EXCEPTION 'User not found with %: %', p_identifier_type, p_identifier;
  END IF;

  -- Check if user is already a team member
  IF EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND user_id = v_invitee_id
  ) THEN
    RAISE EXCEPTION 'User is already a member of this team';
  END IF;

  -- Check for existing pending invitation
  IF EXISTS (
    SELECT 1 FROM public.team_invitations
    WHERE team_id = p_team_id AND invitee_id = v_invitee_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'User already has a pending invitation to this team';
  END IF;

  -- Create invitation
  INSERT INTO public.team_invitations (team_id, inviter_id, invitee_id, status)
  VALUES (p_team_id, auth.uid(), v_invitee_id, 'pending')
  RETURNING id INTO v_invitation_id;

  -- Send notification
  PERFORM public.create_notification(
    v_invitee_id,
    'Team Invitation',
    'You''ve been invited to join the team "' || p_team_name || '"',
    'info',
    '/lab/notifications?invitation=' || v_invitation_id::text
  );

  RETURN v_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_team_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_team_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_team_invitation TO authenticated;
