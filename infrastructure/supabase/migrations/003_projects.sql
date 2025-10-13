-- =============================================
-- PROJECTS & PROJECT RUNS
-- =============================================

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('strategy', 'backtest', 'research', 'data_analysis')),
  config JSONB,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'testing', 'production')),
  code_directory TEXT,
  metrics JSONB,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project runs table
CREATE TABLE IF NOT EXISTS public.project_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL CHECK (run_type IN ('backtest', 'paper_trade', 'live_trade')),
  results JSONB,
  total_return NUMERIC,
  sharpe_ratio NUMERIC,
  max_drawdown NUMERIC,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_runs ENABLE ROW LEVEL SECURITY;

-- Projects policies (team members can view, creator or team owner can modify)
CREATE POLICY "Team members can view projects"
  ON public.projects FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
    AND creator_id = auth.uid()
  );

CREATE POLICY "Creator or team owner can update projects"
  ON public.projects FOR UPDATE
  USING (
    creator_id = auth.uid()
    OR team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid())
  );

CREATE POLICY "Creator or team owner can delete projects"
  ON public.projects FOR DELETE
  USING (
    creator_id = auth.uid()
    OR team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid())
  );

-- Project runs policies (team members can view/create, creator or owner can update)
CREATE POLICY "Team members can view project runs"
  ON public.project_runs FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Team members can create runs"
  ON public.project_runs FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects
      WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Creator or team owner can update runs"
  ON public.project_runs FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE creator_id = auth.uid()
         OR team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid())
    )
  );

-- Trigger to auto-update updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON public.projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_creator_id ON public.projects(creator_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_project_runs_project_id ON public.project_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_runs_status ON public.project_runs(status);
