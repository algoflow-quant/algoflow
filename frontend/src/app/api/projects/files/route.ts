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

    // Recursively list all files from storage
    interface FileItem {
      id: string | null
      name: string
      updated_at: string
      created_at: string
      last_accessed_at: string
      metadata: Record<string, unknown>
    }

    async function listAllFiles(path: string = projectId!): Promise<FileItem[]> {
      const { data: items, error } = await supabase.storage
        .from('project-files')
        .list(path, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' }
        })

      if (error) {
        console.error('Error listing files at path:', path, error)
        throw error
      }

      const allFiles: FileItem[] = []

      for (const item of items || []) {
        if (item.id) {
          // It's a file
          allFiles.push({
            ...item,
            name: path === projectId ? item.name : `${path.replace(projectId + '/', '')}/${item.name}`
          })
        } else {
          // It's a folder - recursively list its contents
          const subPath = `${path}/${item.name}`
          const subFiles = await listAllFiles(subPath)
          allFiles.push(...subFiles)
        }
      }

      return allFiles
    }

    const files = await listAllFiles()

    return NextResponse.json({ files: files || [] })

  } catch (error) {
    console.error('Error in files API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
