import { createClient } from "@/lib/supabase/client"

export interface ProjectFile {
  id: string
  name: string
  created_at: string
  updated_at: string
  last_accessed_at: string
  metadata: {
    eTag: string
    size: number
    mimetype: string
    cacheControl: string
    lastModified: string
    contentLength: number
    httpStatusCode: number
  }
}

export async function getProjectFiles(projectId: string): Promise<ProjectFile[]> {
  const response = await fetch(`/api/projects/files?projectId=${projectId}`)

  if (!response.ok) {
    throw new Error('Failed to fetch project files')
  }

  const data = await response.json()
  return data.files
}

export async function getFileContent(projectId: string, fileName: string): Promise<string> {
  const supabase = createClient()

  const { data, error } = await supabase.storage
    .from('project-files')
    .download(`${projectId}/${fileName}`)

  if (error) throw error

  return await data.text()
}

export async function uploadFile(projectId: string, fileName: string, content: string | Blob) {
  const supabase = createClient()

  // Upload to storage
  const { data, error } = await supabase.storage
    .from('project-files')
    .upload(`${projectId}/${fileName}`, content, {
      upsert: true
    })

  if (error) throw error

  // Get file size
  const size = content instanceof Blob ? content.size : new Blob([content]).size
  const mimeType = content instanceof Blob ? content.type : 'text/plain'

  // Sync with project_files table for realtime
  const { data: { user } } = await supabase.auth.getUser()

  await supabase
    .from('project_files')
    .upsert({
      project_id: projectId,
      name: fileName,
      path: `${projectId}/${fileName}`,
      size,
      mime_type: mimeType,
      created_by: user?.id
    }, {
      onConflict: 'project_id,path'
    })

  return data
}

export async function deleteFile(projectId: string, fileName: string) {
  const supabase = createClient()

  // Delete from storage
  const { error } = await supabase.storage
    .from('project-files')
    .remove([`${projectId}/${fileName}`])

  if (error) throw error

  // Delete from project_files table
  await supabase
    .from('project_files')
    .delete()
    .eq('project_id', projectId)
    .eq('path', `${projectId}/${fileName}`)
}

export async function createFile(projectId: string, fileName: string, content: string = '') {
  return uploadFile(projectId, fileName, content)
}

export async function renameFile(projectId: string, oldName: string, newName: string) {
  const supabase = createClient()

  // Move in storage
  const { data, error } = await supabase.storage
    .from('project-files')
    .move(`${projectId}/${oldName}`, `${projectId}/${newName}`)

  if (error) throw error

  // Update project_files table
  await supabase
    .from('project_files')
    .update({
      name: newName,
      path: `${projectId}/${newName}`
    })
    .eq('project_id', projectId)
    .eq('path', `${projectId}/${oldName}`)

  return data
}

// Real-time file sync using Supabase Storage events
export function subscribeToFileChanges(
  projectId: string,
  _onFileAdded: (file: ProjectFile) => void,
  _onFileRemoved: (fileName: string) => void,
  _onFileUpdated: (file: ProjectFile) => void
) {
  // Note: Supabase Storage doesn't have built-in realtime for file changes
  // We'll poll for changes every 5 seconds for now
  // For production, consider using a database table to track file changes

  const interval = setInterval(async () => {
    try {
      await getProjectFiles(projectId)
      // This is a simplified version - you'd need to track state to detect actual changes
      // For now, just refresh the file list
    } catch (error) {
      console.error('Error polling for file changes:', error)
    }
  }, 5000)

  return () => {
    clearInterval(interval)
  }
}
