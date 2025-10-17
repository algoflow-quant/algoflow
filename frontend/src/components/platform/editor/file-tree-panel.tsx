"use client"

import { IconFolder, IconFile, IconFileCode } from "@tabler/icons-react"
import { Tree, File } from "@/components/ui/file-tree"
import { useEffect, useState } from "react"
import { getProjectFiles, getFileContent, type ProjectFile } from "@/lib/api/files"
import { useWorkspace } from "./workspace-context"
import { getGlobalLayout } from "./workspace-layout"

interface FileTreePanelProps {
  projectId?: string
}

export function FileTreePanel({ projectId }: FileTreePanelProps = {}) {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(true)
  const { addFile } = useWorkspace()

  console.log('[FileTreePanel] Component rendered, projectId:', projectId)

  useEffect(() => {
    console.log('[FileTreePanel] useEffect triggered, projectId:', projectId)
    if (!projectId) {
      console.log('[FileTreePanel] No projectId, skipping file load')
      setLoading(false)
      return
    }

    loadFiles()

    // Poll for file changes every 5 seconds
    const interval = setInterval(loadFiles, 5000)

    return () => clearInterval(interval)
  }, [projectId])

  const loadFiles = async () => {
    if (!projectId) return

    try {
      console.log('[FileTreePanel] Loading files for project:', projectId)
      const projectFiles = await getProjectFiles(projectId)
      console.log('[FileTreePanel] Files loaded:', projectFiles)
      setFiles(projectFiles)
    } catch (error) {
      console.error('[FileTreePanel] Error loading files:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.py')) {
      return <IconFileCode className="h-4 w-4" />
    }
    if (fileName.endsWith('.ipynb')) {
      return <IconFileCode className="h-4 w-4" />
    }
    return <IconFile className="h-4 w-4" />
  }

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      <div className="p-3 border-b border-border flex-shrink-0">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <IconFolder className="h-4 w-4 text-brand-blue" />
          Files
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading files...</p>
        ) : files.length === 0 ? (
          <p className="text-xs text-muted-foreground">No files yet</p>
        ) : (
          <Tree className="w-full">
            {files.map((file) => (
              <File
                key={file.id}
                value={file.name}
                fileIcon={getFileIcon(file.name)}
                handleSelect={async () => {
                  if (!projectId) return

                  try {
                    const content = await getFileContent(projectId, file.name)
                    addFile(file.name, content)

                    const layout = getGlobalLayout()
                    if (layout) {
                      try {
                        const root = (layout as any).rootItem
                        const middleColumn = root?.contentItems?.[1]

                        if (middleColumn) {
                          // Find the stack that contains editor panels
                          let editorStack = null
                          const findStack = (item: any): any => {
                            if (item.type === 'stack') {
                              return item
                            }
                            if (item.contentItems) {
                              for (const child of item.contentItems) {
                                const found = findStack(child)
                                if (found) return found
                              }
                            }
                            return null
                          }
                          editorStack = findStack(middleColumn)

                          if (!editorStack) return

                          // Check if file is already open
                          let existingEditor = null
                          const findEditor = (item: any): any => {
                            if (item.isComponent && item.componentType === 'editor') {
                              const container = (item as any).container
                              const state = container?._customState || container?.state || {}
                              if (state.fileName === file.name) {
                                return item
                              }
                            }
                            if (item.contentItems) {
                              for (const child of item.contentItems) {
                                const found = findEditor(child)
                                if (found) return found
                              }
                            }
                            return null
                          }
                          existingEditor = findEditor(editorStack)

                          if (existingEditor) {
                            // Switch to existing tab
                            editorStack.setActiveContentItem(existingEditor)
                          } else {
                            // Check if there's an empty editor to replace
                            let emptyEditor = null
                            const findEmptyEditor = (item: any): any => {
                              if (item.isComponent && item.componentType === 'editor') {
                                const container = (item as any).container
                                const state = container?._customState || container?.state || {}
                                if (!state.fileName) {
                                  return item
                                }
                              }
                              if (item.contentItems) {
                                for (const child of item.contentItems) {
                                  const found = findEmptyEditor(child)
                                  if (found) return found
                                }
                              }
                              return null
                            }
                            emptyEditor = findEmptyEditor(editorStack)

                            if (emptyEditor) {
                              // Update empty editor with file
                              const container = (emptyEditor as any).container
                              if (container) {
                                ;(container as any)._customState = { fileName: file.name }
                                if (container.emit) {
                                  container.emit('stateChanged')
                                }
                              }
                              ;(emptyEditor as any).setTitle(file.name)
                              editorStack.setActiveContentItem(emptyEditor)
                            } else {
                              // Add new editor tab
                              editorStack.addComponent('editor', { fileName: file.name }, file.name)
                            }
                          }
                        }
                      } catch (err) {
                        console.error('[FileTreePanel] Error opening file:', err)
                      }
                    }
                  } catch (error) {
                    console.error('[FileTreePanel] Error loading file content:', error)
                  }
                }}
              >
                {file.name}
              </File>
            ))}
          </Tree>
        )}
      </div>
    </div>
  )
}
