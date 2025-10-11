import { createClient } from "@/lib/supabase/client"

export interface Team {
  id: string
  name: string
  description?: string
  owner_id: string
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  created_at: string
}

export interface Project {
  id: string
  team_id: string
  name: string
  description?: string
  type: 'strategy' | 'backtest' | 'research' | 'data_analysis'
  config?: any
  status: 'active' | 'archived' | 'testing' | 'production'
  code_directory?: string
  metrics?: any
  created_at: string
  updated_at: string
  last_run_at?: string
}

// Team operations
export async function getUserTeams() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('teams')
    .select(`
      *,
      team_members!inner(role)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Team[]
}

export async function createTeam(name: string, description?: string) {
  const supabase = createClient()

  // Check if user already has 5 teams
  const { data: existingTeams } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', (await supabase.auth.getUser()).data.user?.id)

  if (existingTeams && existingTeams.length >= 5) {
    throw new Error('Maximum of 5 teams allowed per user')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('teams')
    .insert({
      name,
      description,
      owner_id: user.id
    })
    .select()
    .single()

  if (error) throw error
  return data as Team
}

export async function updateTeam(teamId: string, updates: Partial<Pick<Team, 'name' | 'description'>>) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', teamId)
    .select()
    .single()

  if (error) throw error
  return data as Team
}

export async function deleteTeam(teamId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId)

  if (error) throw error
}

// Team member operations
export async function getTeamMembers(teamId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('team_members')
    .select(`
      *,
      user:auth.users(id, email, raw_user_meta_data)
    `)
    .eq('team_id', teamId)

  if (error) throw error
  return data
}

export async function addTeamMember(teamId: string, userId: string, role: 'admin' | 'member' = 'member') {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('team_members')
    .insert({
      team_id: teamId,
      user_id: userId,
      role
    })
    .select()
    .single()

  if (error) throw error
  return data as TeamMember
}

export async function removeTeamMember(teamId: string, userId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId)

  if (error) throw error
}

// Project operations
export async function getTeamProjects(teamId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Project[]
}

export async function getProject(projectId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error) throw error
  return data as Project
}

export async function createProject(
  teamId: string,
  project: Pick<Project, 'name' | 'description' | 'type'> & Partial<Pick<Project, 'config' | 'status'>>
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('projects')
    .insert({
      team_id: teamId,
      ...project
    })
    .select()
    .single()

  if (error) throw error
  return data as Project
}

export async function updateProject(
  projectId: string,
  updates: Partial<Omit<Project, 'id' | 'team_id' | 'created_at' | 'updated_at'>>
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single()

  if (error) throw error
  return data as Project
}

export async function deleteProject(projectId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) throw error
}

// Project run operations
export interface ProjectRun {
  id: string
  project_id: string
  run_type: 'backtest' | 'paper_trade' | 'live_trade'
  results?: any
  total_return?: number
  sharpe_ratio?: number
  max_drawdown?: number
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  error_message?: string
  started_at: string
  completed_at?: string
}

export async function getProjectRuns(projectId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('project_runs')
    .select('*')
    .eq('project_id', projectId)
    .order('started_at', { ascending: false })

  if (error) throw error
  return data as ProjectRun[]
}

export async function createProjectRun(
  projectId: string,
  runType: ProjectRun['run_type']
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('project_runs')
    .insert({
      project_id: projectId,
      run_type: runType,
      status: 'running'
    })
    .select()
    .single()

  if (error) throw error
  return data as ProjectRun
}

export async function updateProjectRun(
  runId: string,
  updates: Partial<Omit<ProjectRun, 'id' | 'project_id' | 'started_at'>>
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('project_runs')
    .update(updates)
    .eq('id', runId)
    .select()
    .single()

  if (error) throw error
  return data as ProjectRun
}
