import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const fileName = searchParams.get('fileName')

    if (!projectId || !fileName) {
      return NextResponse.json(
        { error: 'Project ID and file name are required' },
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

    // Download file from storage
    const { data: file, error } = await supabase.storage
      .from('project-files')
      .download(`${projectId}/${fileName}`)

    if (error) {
      console.error('Error downloading file:', error)
      return NextResponse.json(
        { error: 'Failed to download file' },
        { status: 500 }
      )
    }

    const content = await file.text()

    return NextResponse.json({ content })

  } catch (error) {
    console.error('Error in file content API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
