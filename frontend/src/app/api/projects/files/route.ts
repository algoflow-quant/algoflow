import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify user has access to this project
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: project } = await supabase
      .from('projects')
      .select('*, teams!inner(id)')
      .eq('id', projectId)
      .single()

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if user is a member of the team
    const { data: membership } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', project.team_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Unauthorized - not a team member' },
        { status: 403 }
      )
    }

    // List files from storage
    const { data: files, error } = await supabase.storage
      .from('project-files')
      .list(projectId, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (error) {
      console.error('Error listing files:', error)
      return NextResponse.json(
        { error: 'Failed to list files' },
        { status: 500 }
      )
    }

    return NextResponse.json({ files: files || [] })

  } catch (error) {
    console.error('Error in files API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
