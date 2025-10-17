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

  const { data, error } = await supabase.storage
    .from('project-files')
    .upload(`${projectId}/${fileName}`, content, {
      upsert: true
    })

  if (error) throw error
  return data
}

export async function deleteFile(projectId: string, fileName: string) {
  const supabase = createClient()

  const { error } = await supabase.storage
    .from('project-files')
    .remove([`${projectId}/${fileName}`])

  if (error) throw error
}

// Real-time file sync using Supabase Storage events
export function subscribeToFileChanges(
  projectId: string,
  onFileAdded: (file: ProjectFile) => void,
  onFileRemoved: (fileName: string) => void,
  onFileUpdated: (file: ProjectFile) => void
) {
  const supabase = createClient()

  // Note: Supabase Storage doesn't have built-in realtime for file changes
  // We'll poll for changes every 5 seconds for now
  // For production, consider using a database table to track file changes

  const interval = setInterval(async () => {
    try {
      const files = await getProjectFiles(projectId)
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
