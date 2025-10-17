import { createClient } from "@/lib/supabase/client"

export interface Team {
  id: string
  name: string
  description?: string
  avatar_url?: string | null
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
  creator_id: string
  name: string
  description?: string
  type: 'strategy' | 'backtest' | 'research' | 'data_analysis'
  config?: Record<string, unknown>
  status: 'active' | 'archived' | 'testing' | 'production'
  code_directory?: string
  metrics?: Record<string, unknown>
  created_at: string
  updated_at: string
  last_run_at?: string
}

// Permission helpers
export async function isTeamOwner(teamId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: team } = await supabase
    .from('teams')
    .select('owner_id')
    .eq('id', teamId)
    .single()

  return team?.owner_id === user.id
}

export async function canModifyProject(projectId: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: project } = await supabase
    .from('projects')
    .select('creator_id, team_id, teams!inner(owner_id)')
    .eq('id', projectId)
    .single()

  if (!project) return false

  // User can modify if they are the creator OR team owner
  return project.creator_id === user.id ||
         (project.teams as unknown as { owner_id: string }).owner_id === user.id
}

export function canModifyProjectSync(project: Project, userId: string, isTeamOwner: boolean): boolean {
  return project.creator_id === userId || isTeamOwner
}

export async function getUserTeams() {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_user_teams')

  if (error) throw error
  return data as Team[]
}

export async function createTeam(name: string, description?: string) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Check if user already has 5 teams
  const { data: existingTeams } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', user.id)

  if (existingTeams && existingTeams.length >= 5) {
    throw new Error('Maximum of 5 teams allowed per user')
  }

  // Check for duplicate team name for this user
  const { data: duplicateTeam } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', user.id)
    .eq('name', name)
    .single()

  if (duplicateTeam) {
    throw new Error('You already have a team with this name')
  }

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

export async function updateTeam(teamId: string, updates: Partial<Pick<Team, 'name' | 'description' | 'avatar_url'>>) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Check for duplicate team name if name is being updated
  if (updates.name) {
    const { data: duplicateTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('owner_id', user.id)
      .eq('name', updates.name)
      .neq('id', teamId)
      .single()

    if (duplicateTeam) {
      throw new Error('You already have a team with this name')
    }
  }

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
      profiles!user_id (
        id,
        name,
        username,
        email,
        avatar_url,
        role
      )
    `)
    .eq('team_id', teamId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as (TeamMember & { profiles: { id: string; name: string | null; username: string | null; email: string | null; avatar_url: string | null; role: string } })[]
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
  const response = await fetch('/api/teams/remove-member', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      teamId,
      userId
    })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to remove member')
  }

  return data
}

export async function inviteTeamMember(teamId: string, teamName: string, identifier: string, identifierType: 'email' | 'username') {
  const response = await fetch('/api/teams/invite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      teamId,
      teamName,
      identifier,
      identifierType
    })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to send invitation')
  }

  return data.invitationId
}

export async function acceptTeamInvitation(invitationId: string) {
  const supabase = createClient()

  const { error } = await supabase.rpc('accept_team_invitation', {
    invitation_id: invitationId
  })

  if (error) throw error
}

export async function declineTeamInvitation(invitationId: string) {
  const supabase = createClient()

  const { error } = await supabase.rpc('decline_team_invitation', {
    invitation_id: invitationId
  })

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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('projects')
    .insert({
      team_id: teamId,
      creator_id: user.id,
      ...project
    })
    .select()
    .single()

  if (error) throw error

  console.log('[createProject] Project created:', data.id)

  // Initialize default project files
  try {
    console.log('[createProject] Calling file initialization API for project:', data.id)
    const response = await fetch('/api/projects/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ projectId: data.id })
    })

    console.log('[createProject] API response status:', response.status)
    const responseText = await response.text()
    console.log('[createProject] API response:', responseText)

    if (!response.ok) {
      console.error('[createProject] Failed to initialize project files:', responseText)
      // Don't throw - project is created, files can be added later
    } else {
      console.log('[createProject] Files initialized successfully')
    }
  } catch (fileError) {
    console.error('[createProject] Error initializing project files:', fileError)
    // Don't throw - project is created, files can be added later
  }

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
  results?: Record<string, unknown>
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
