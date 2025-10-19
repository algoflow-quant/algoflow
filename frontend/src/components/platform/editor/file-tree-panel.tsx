"use client"

import { IconPlus, IconFolderPlus, IconEdit, IconTrash, IconRefresh, IconLayoutGrid, IconUpload } from "@tabler/icons-react"
import {
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  FileJson,
  FileImage,
  FileVideo,
  FileArchive,
  File as FileIcon
} from "lucide-react"
import { useEffect, useState, useRef, useMemo } from "react"
import { useProjectPresence } from "./use-project-presence"
import { UserAvatars } from "./user-avatars"
import { getProjectFiles, getFileContent, createFile, deleteFile, renameFile, uploadFile, type ProjectFile } from "@/lib/api/files"
import { createClient } from "@/lib/supabase/client"
import { useWorkspace } from "./workspace-context"
import { getGlobalLayout } from "./workspace-layout"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  ContextMenuCheckboxItem,
} from "@/components/ui/context-menu"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usePanelManagerContext } from "./panel-manager-context"
import { PANEL_REGISTRY } from "./panel-registry"
import { cn } from "@/lib/utils"
import { ChevronRight, ChevronDown } from "lucide-react"

interface FileTreePanelProps {
  projectId?: string
}

interface FileNode {
  name: string
  path: string
  isFolder: boolean
  children?: FileNode[]
  file?: ProjectFile
}

export function FileTreePanel({ projectId }: FileTreePanelProps = {}) {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(true)
  const { addFile } = useWorkspace()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [draggedFile, setDraggedFile] = useState<ProjectFile | null>(null)
  const [draggedFolder, setDraggedFolder] = useState<string | null>(null)
  const [dragOverPath, setDragOverPath] = useState<string | null>(null)

  // Track presence for avatar display using the new system (no file name needed - we just read)
  const { fileUsersMap } = useProjectPresence(projectId || null)

  // Dialog states
  const [showCreateFileDialog, setShowCreateFileDialog] = useState(false)
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null)
  const [newFileName, setNewFileName] = useState("")
  const [contextPath, setContextPath] = useState<string>("")

  // Panel management - use shared context
  const panelManager = usePanelManagerContext()

  // Force re-render when visiblePanelsArray changes
  const panelKey = panelManager.visiblePanelsArray.join('-')


  const loadFiles = async () => {
    if (!projectId) return

    try {
      const projectFiles = await getProjectFiles(projectId)

      // Filter out folders - Supabase storage returns folders with id null
      const actualFiles = projectFiles.filter(f => f.id !== null)

      setFiles(actualFiles)
    } catch (error) {
      console.error('[FileTreePanel] Error loading files:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!projectId) {
      setLoading(false)
      return
    }

    loadFiles()

    // Subscribe to realtime file changes
    const supabase = createClient()
    const channel = supabase
      .channel(`project-files:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_files',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          // Reload files when any change occurs
          loadFiles()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const buildFileTree = (files: ProjectFile[]): FileNode[] => {
    const root: FileNode[] = []
    const folderMap = new Map<string, FileNode>()

    // First, identify all unique folders from file paths
    const allFolders = new Set<string>()
    files.forEach(file => {
      const parts = file.name.split('/')
      for (let i = 0; i < parts.length - 1; i++) {
        const folderPath = parts.slice(0, i + 1).join('/')
        allFolders.add(folderPath)
      }
    })

    // Create folder nodes
    Array.from(allFolders).sort().forEach(folderPath => {
      const parts = folderPath.split('/')
      const name = parts[parts.length - 1]
      const parentPath = parts.slice(0, -1).join('/')

      const folderNode: FileNode = {
        name,
        path: folderPath,
        isFolder: true,
        children: []
      }

      folderMap.set(folderPath, folderNode)

      if (parentPath) {
        const parent = folderMap.get(parentPath)
        if (parent) {
          parent.children!.push(folderNode)
        }
      } else {
        root.push(folderNode)
      }
    })

    // Add files (skip .gitkeep files)
    files.filter(f => !f.name.endsWith('.gitkeep')).forEach(file => {
      const parts = file.name.split('/')
      const name = parts[parts.length - 1]
      const parentPath = parts.slice(0, -1).join('/')

      const fileNode: FileNode = {
        name,
        path: file.name,
        isFolder: false,
        file
      }

      if (parentPath) {
        const parent = folderMap.get(parentPath)
        if (parent) {
          parent.children!.push(fileNode)
        }
      } else {
        root.push(fileNode)
      }
    })

    return root
  }

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const handleCreateFile = async (basePath?: string) => {
    if (!projectId || !newFileName) return

    try {
      const fullPath = basePath ? `${basePath}/${newFileName}` : newFileName
      await createFile(projectId, fullPath, '')
      setShowCreateFileDialog(false)
      setNewFileName('')
      setContextPath('')
      await loadFiles()
    } catch (error) {
      console.error('[FileTreePanel] Error creating file:', error)
    }
  }

  const handleCreateFolder = async (basePath?: string) => {
    if (!projectId || !newFileName) return

    try {
      const fullPath = basePath ? `${basePath}/${newFileName}` : newFileName
      await createFile(projectId, `${fullPath}/.gitkeep`, '')
      setShowCreateFolderDialog(false)
      setNewFileName('')
      setContextPath('')

      // Auto-expand the new folder
      setExpandedFolders(prev => new Set(prev).add(fullPath))
      await loadFiles()
    } catch (error) {
      console.error('[FileTreePanel] Error creating folder:', error)
    }
  }

  const handleRenameFile = async () => {
    if (!projectId || !selectedFile || !newFileName) return

    try {
      await renameFile(projectId, selectedFile.name, newFileName)
      setShowRenameDialog(false)
      setNewFileName('')
      setSelectedFile(null)
      await loadFiles()
    } catch (error) {
      console.error('[FileTreePanel] Error renaming file:', error)
    }
  }

  const handleDeleteFile = async (file: ProjectFile) => {
    if (!projectId || !confirm(`Are you sure you want to delete ${file.name}?`)) return

    try {
      await deleteFile(projectId, file.name)
      await loadFiles()
    } catch (error) {
      console.error('[FileTreePanel] Error deleting file:', error)
    }
  }

  const handleDeleteFolder = async (folderPath: string) => {
    if (!projectId || !confirm(`Are you sure you want to delete the folder "${folderPath}" and all its contents?`)) return

    try {
      // Get all files in this folder (including .gitkeep and nested files)
      // Need to match exact folder path including trailing slash or files within it
      const filesToDelete = files.filter(f =>
        f.name === `${folderPath}/.gitkeep` || f.name.startsWith(`${folderPath}/`)
      )


      // Delete all files in the folder
      for (const file of filesToDelete) {
        await deleteFile(projectId, file.name)
      }

      await loadFiles()
    } catch (error) {
      console.error('[FileTreePanel] Error deleting folder:', error)
    }
  }

  const handleDragStart = (e: React.DragEvent, file: ProjectFile) => {
    e.stopPropagation()
    setDraggedFile(file)
    setDraggedFolder(null)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleFolderDragStart = (e: React.DragEvent, folderPath: string) => {
    e.stopPropagation()
    setDraggedFolder(folderPath)
    setDraggedFile(null)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation()
    setDraggedFile(null)
    setDraggedFolder(null)
    setDragOverPath(null)
  }

  const handleDragOver = (e: React.DragEvent, folderPath?: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (folderPath) {
      setDragOverPath(folderPath)
    } else {
      setDragOverPath('root')
    }

    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setDragOverPath(null)
  }

  const handleDrop = async (e: React.DragEvent, targetFolderPath?: string) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setDragOverPath(null)

    if (!projectId) return

    // Handle file upload from outside
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      for (const file of droppedFiles) {
        try {
          const uploadPath = targetFolderPath ? `${targetFolderPath}/${file.name}` : file.name
          await uploadFile(projectId, uploadPath, file)
        } catch (error) {
          console.error('[FileTreePanel] Error uploading file:', error)
        }
      }
      await loadFiles()
      return
    }

    // Handle folder move
    if (draggedFolder) {
      try {
        // Prevent dropping folder into itself or its children
        if (targetFolderPath?.startsWith(draggedFolder + '/') || targetFolderPath === draggedFolder) {
          setDraggedFolder(null)
          return
        }

        const folderName = draggedFolder.split('/').pop() || draggedFolder
        const newFolderPath = targetFolderPath ? `${targetFolderPath}/${folderName}` : folderName

        if (newFolderPath !== draggedFolder) {
          // Get all files in the folder
          const filesToMove = files.filter(f =>
            f.name.startsWith(`${draggedFolder}/`)
          )


          // Move each file
          for (const file of filesToMove) {
            const relativePath = file.name.substring(draggedFolder.length + 1)
            const newPath = `${newFolderPath}/${relativePath}`

            const content = await getFileContent(projectId, file.name)
            await createFile(projectId, newPath, content)
            await deleteFile(projectId, file.name)
          }

          await loadFiles()
        }
      } catch (error) {
        console.error('[FileTreePanel] Error moving folder:', error)
      }
      setDraggedFolder(null)
      return
    }

    // Handle internal file move
    if (draggedFile) {
      try {
        const fileName = draggedFile.name.split('/').pop() || draggedFile.name
        const newPath = targetFolderPath ? `${targetFolderPath}/${fileName}` : fileName

        if (newPath !== draggedFile.name) {
          // Read content, create in new location, delete old
          const content = await getFileContent(projectId, draggedFile.name)
          await createFile(projectId, newPath, content)
          await deleteFile(projectId, draggedFile.name)
          await loadFiles()
        }
      } catch (error) {
        console.error('[FileTreePanel] Error moving file:', error)
      }
      setDraggedFile(null)
    }
  }

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!projectId || !e.target.files) return

    const selectedFiles = Array.from(e.target.files)

    for (const file of selectedFiles) {
      try {
        await uploadFile(projectId, file.name, file)
      } catch (error) {
        console.error('[FileTreePanel] Error uploading file:', error)
      }
    }

    await loadFiles()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()

    switch (ext) {
      case 'py':
        return <FileCode className="h-4 w-4 text-blue-500" />
      case 'ipynb':
        return <FileCode className="h-4 w-4 text-orange-500" />
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <FileCode className="h-4 w-4 text-yellow-500" />
      case 'json':
        return <FileJson className="h-4 w-4 text-green-500" />
      case 'md':
      case 'txt':
        return <FileText className="h-4 w-4 text-gray-500" />
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <FileImage className="h-4 w-4 text-purple-500" />
      case 'mp4':
      case 'mov':
      case 'avi':
        return <FileVideo className="h-4 w-4 text-pink-500" />
      case 'zip':
      case 'tar':
      case 'gz':
        return <FileArchive className="h-4 w-4 text-amber-500" />
      default:
        return <FileIcon className="h-4 w-4 text-gray-400" />
    }
  }

  const openFileInEditor = async (file: ProjectFile) => {
    if (!projectId) return

    try {
      const content = await getFileContent(projectId, file.name)
      addFile(file.name, content)

      const layout = getGlobalLayout()
      if (layout) {
        try {
          type LayoutItem = {
            type?: string
            isComponent?: boolean
            componentType?: string
            contentItems?: LayoutItem[]
            container?: {
              _customState?: { fileName?: string }
              state?: { fileName?: string }
              emit?: (event: string) => void
            }
            setTitle?: (title: string) => void
          }
          type LayoutStack = LayoutItem & {
            setActiveContentItem: (item: LayoutItem) => void
            addComponent: (type: string, state: { fileName: string }, title: string) => void
          }

          const root = (layout as { rootItem: LayoutItem }).rootItem
          const middleColumn = root?.contentItems?.[1]

          if (middleColumn) {
            let editorStack: LayoutStack | null = null
            const findStack = (item: LayoutItem): LayoutStack | null => {
              if (item.type === 'stack') {
                return item as LayoutStack
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

            let existingEditor: LayoutItem | null = null
            const findEditor = (item: LayoutItem): LayoutItem | null => {
              if (item.isComponent && item.componentType === 'editor') {
                const container = item.container
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
              editorStack.setActiveContentItem(existingEditor)
            } else {
              let emptyEditor: LayoutItem | null = null
              const findEmptyEditor = (item: LayoutItem): LayoutItem | null => {
                if (item.isComponent && item.componentType === 'editor') {
                  const container = item.container
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
                const container = emptyEditor.container
                if (container) {
                  container._customState = { fileName: file.name }
                  if (container.emit) {
                    container.emit('stateChanged')
                  }
                }
                if (emptyEditor.setTitle) {
                  emptyEditor.setTitle(file.name)
                }
                editorStack.setActiveContentItem(emptyEditor)
              } else {
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
  }

  const renderFileNode = (node: FileNode, depth: number = 0): React.ReactNode => {
    if (node.isFolder) {
      const isExpanded = expandedFolders.has(node.path)
      const isOver = dragOverPath === node.path

      return (
        <div key={node.path} className="w-full">
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded hover:bg-accent cursor-pointer select-none transition-colors",
                  isOver && "bg-accent ring-1 ring-brand-blue",
                  draggedFolder === node.path && "opacity-50"
                )}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                draggable
                onDragStart={(e) => handleFolderDragStart(e, node.path)}
                onDragEnd={handleDragEnd}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFolder(node.path)
                }}
                onDragOver={(e) => handleDragOver(e, node.path)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, node.path)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )}
                {isExpanded ? (
                  <FolderOpen className="h-4 w-4 shrink-0 text-blue-500" />
                ) : (
                  <Folder className="h-4 w-4 shrink-0 text-blue-500" />
                )}
                <span className="text-sm truncate">{node.name}</span>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent onClick={(e) => e.stopPropagation()}>
              <ContextMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setContextPath(node.path)
                  setShowCreateFileDialog(true)
                }}
              >
                <IconPlus className="h-4 w-4 mr-2" />
                New File Inside
              </ContextMenuItem>
              <ContextMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setContextPath(node.path)
                  setShowCreateFolderDialog(true)
                }}
              >
                <IconFolderPlus className="h-4 w-4 mr-2" />
                New Folder Inside
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteFolder(node.path)
                }}
                className="text-destructive"
              >
                <IconTrash className="h-4 w-4 mr-2" />
                Delete Folder
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
          {isExpanded && node.children && node.children.length > 0 && (
            <div>
              {node.children.map(child => renderFileNode(child, depth + 1))}
            </div>
          )}
        </div>
      )
    } else if (node.file) {
      const parts = node.path.split('/')
      const parentPath = parts.slice(0, -1).join('/')
      const isDraggingThis = draggedFile?.name === node.file.name

      // Get users editing this file
      // File presence tracks by just the name (e.g., "main.py"), not the full path
      const usersEditingFile = fileUsersMap.get(node.file.name) || []

      return (
        <ContextMenu key={node.path}>
          <ContextMenuTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded hover:bg-accent cursor-pointer select-none transition-colors",
                isDraggingThis && "opacity-50"
              )}
              style={{ paddingLeft: `${depth * 12 + 32}px` }}
              draggable
              onDragStart={(e) => handleDragStart(e, node.file!)}
              onDragEnd={handleDragEnd}
              onClick={(e) => {
                e.stopPropagation()
                openFileInEditor(node.file!)
              }}
            >
              {getFileIcon(node.name)}
              <span className="text-sm truncate flex-1">{node.name}</span>
              {usersEditingFile.length > 0 && (
                <UserAvatars users={usersEditingFile} size="sm" max={3} />
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent onClick={(e) => e.stopPropagation()}>
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation()
                setSelectedFile(node.file!)
                setNewFileName(node.file!.name)
                setShowRenameDialog(true)
              }}
            >
              <IconEdit className="h-4 w-4 mr-2" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteFile(node.file!)
              }}
              className="text-destructive"
            >
              <IconTrash className="h-4 w-4 mr-2" />
              Delete
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation()
                setContextPath(parentPath)
                setShowCreateFileDialog(true)
              }}
            >
              <IconPlus className="h-4 w-4 mr-2" />
              New File Adjacent
            </ContextMenuItem>
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation()
                setContextPath(parentPath)
                setShowCreateFolderDialog(true)
              }}
            >
              <IconFolderPlus className="h-4 w-4 mr-2" />
              New Folder Adjacent
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )
    }
    return null
  }

  const fileTree = useMemo(() => buildFileTree(files), [files])

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "flex flex-col h-full w-full bg-background overflow-hidden",
              isDragging && dragOverPath === 'root' && "ring-2 ring-brand-blue"
            )}
            onDragOver={(e) => handleDragOver(e)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e)}
          >
            <div className="p-3 border-b border-border flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Folder className="h-4 w-4 text-blue-500" />
                  Files
                </h3>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload Files"
                  >
                    <IconUpload className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowCreateFileDialog(true)}
                    title="New File"
                  >
                    <IconPlus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowCreateFolderDialog(true)}
                    title="New Folder"
                  >
                    <IconFolderPlus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {loading ? (
                <p className="text-xs text-muted-foreground p-4">Loading files...</p>
              ) : files.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-8">
                  <p>No files yet</p>
                  <p className="mt-2">Drag files here or click + to add</p>
                </div>
              ) : (
                <div className="py-1">
                  {fileTree.map(node => renderFileNode(node, 0))}
                </div>
              )}
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setShowCreateFileDialog(true)}>
            <IconPlus className="h-4 w-4 mr-2" />
            New File
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setShowCreateFolderDialog(true)}>
            <IconFolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </ContextMenuItem>
          <ContextMenuItem onClick={() => fileInputRef.current?.click()}>
            <IconUpload className="h-4 w-4 mr-2" />
            Upload Files
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <IconLayoutGrid className="h-4 w-4 mr-2" />
              Panels
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48">
              {Object.entries(PANEL_REGISTRY).map(([id, panel]) => {
                const Icon = panel.icon
                // Use array from context to force re-render when it changes
                const isChecked = panelManager.visiblePanels.has(id)
                const arrayKey = panelManager.visiblePanelsArray.join('-')
                return (
                  <ContextMenuCheckboxItem
                    key={`${id}-${arrayKey}`}
                    checked={isChecked}
                    onCheckedChange={() => {
                      panelManager.togglePanel(id)
                    }}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {panel.title}
                  </ContextMenuCheckboxItem>
                )
              })}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={panelManager.resetLayout}>
            <IconRefresh className="h-4 w-4 mr-2" />
            Reset Layout
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Create File Dialog */}
      <Dialog open={showCreateFileDialog} onOpenChange={setShowCreateFileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
            <DialogDescription>
              {contextPath ? `Creating file in: ${contextPath}/` : 'Enter a name for the new file.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="filename">File name</Label>
              <Input
                id="filename"
                placeholder="example.py"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateFile(contextPath)
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateFileDialog(false)
              setNewFileName('')
              setContextPath('')
            }}>
              Cancel
            </Button>
            <Button onClick={() => handleCreateFile(contextPath)}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              {contextPath ? `Creating folder in: ${contextPath}/` : 'Enter a name for the new folder. A .gitkeep file will be created inside.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="foldername">Folder name</Label>
              <Input
                id="foldername"
                placeholder="my-folder"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateFolder(contextPath)
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateFolderDialog(false)
              setNewFileName('')
              setContextPath('')
            }}>
              Cancel
            </Button>
            <Button onClick={() => handleCreateFolder(contextPath)}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename File Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>
              Enter a new name for the file.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newname">New name</Label>
              <Input
                id="newname"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameFile()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRenameDialog(false)
              setNewFileName('')
              setSelectedFile(null)
            }}>
              Cancel
            </Button>
            <Button onClick={handleRenameFile}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
