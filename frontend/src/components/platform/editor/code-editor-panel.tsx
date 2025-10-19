"use client"

import Editor from "@monaco-editor/react"
import { useWorkspace } from "./workspace-context"
import { useRef, useEffect, useState, useCallback } from "react"
import { onThemeChange } from "./workspace-layout"
import { useRealtimeCollab } from "./use-realtime-collab"
import { useProjectPresence } from "./use-project-presence"
import { uploadFile } from "@/lib/api/files"
import { JupyterNotebookWrapper } from "./jupyter-notebook-wrapper"

interface CodeEditorPanelProps {
  projectId?: string
  fileName?: string
}

export function CodeEditorPanel({ projectId, fileName }: CodeEditorPanelProps = {}) {
  const { openFiles, activeFile, updateFileContent, setActiveFile } = useWorkspace()
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null)
  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null)
  const [currentTheme, setCurrentTheme] = useState<string>('dark')
  const [isEditorReady, setIsEditorReady] = useState(false)

  // Use fileName prop if provided (for tabs), otherwise use activeFile (for default editor)
  const currentFileName = fileName || activeFile || ''
  const fileData = openFiles.find(f => f.fileName === currentFileName)

  // Track if this tab is currently active
  const isActiveTab = currentFileName === activeFile

  // When this editor is clicked/focused, make it the active file
  const handleEditorClick = () => {
    if (currentFileName && currentFileName !== activeFile) {
      setActiveFile(currentFileName)
    }
  }

  // Track file presence using the new system (only when we have a file name)
  useProjectPresence(projectId || null, currentFileName || undefined)

  // Enable real-time collaboration only when editor is ready
  const { myColor } = useRealtimeCollab({
    projectId: projectId || '',
    fileName: currentFileName,
    editor: isEditorReady ? editorRef.current : null,
    monaco: isEditorReady ? monacoRef.current : null
  })

  // Auto-save with debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedSave = useCallback((content: string) => {
    if (!projectId || !currentFileName) return

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout to save after 1 second of no changes
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await uploadFile(projectId, currentFileName, content)
        console.log('[CodeEditor] Auto-saved:', currentFileName)
      } catch (error) {
        console.error('[CodeEditor] Auto-save failed:', error)
      }
    }, 1000)
  }, [projectId, currentFileName])

  // Listen for theme changes from workspace-layout
  useEffect(() => {
    const unsubscribe = onThemeChange((theme) => {
      setCurrentTheme(theme)
    })
    return unsubscribe
  }, [])

  // Listen for tab activation events from GoldenLayout
  useEffect(() => {
    const handleTabActivation = (event: Event) => {
      const customEvent = event as CustomEvent<{ fileName: string }>
      const activatedFileName = customEvent.detail.fileName

      // If this tab was activated, update the global activeFile
      if (activatedFileName === currentFileName) {
        setActiveFile(activatedFileName)
      }
    }

    window.addEventListener('editor-tab-activated', handleTabActivation)
    return () => {
      window.removeEventListener('editor-tab-activated', handleTabActivation)
    }
  }, [currentFileName, setActiveFile])

  // Add cursor styles
  useEffect(() => {
    const style = document.createElement('style')
    style.innerHTML = `
      .remote-cursor-bar {
        color: ${myColor};
        font-weight: bold;
        animation: blink 1s infinite;
      }
      .remote-cursor-name {
        background: ${myColor};
        color: white;
        padding: 2px 4px;
        border-radius: 2px;
        font-size: 10px;
        margin-right: 2px;
      }
      @keyframes blink {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0; }
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [myColor])

  const getLanguage = (fileName: string) => {
    if (fileName.endsWith('.py')) return 'python'
    if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return 'javascript'
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return 'typescript'
    if (fileName.endsWith('.json')) return 'json'
    if (fileName.endsWith('.ipynb')) return 'json'
    return 'plaintext'
  }

  // Check if this is a Jupyter notebook
  const isNotebook = currentFileName.endsWith('.ipynb')

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden" onClick={handleEditorClick}>
      <div className="flex-1 overflow-hidden bg-background relative">
        {!currentFileName || !fileData ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No file selected
          </div>
        ) : isNotebook ? (
          <JupyterNotebookWrapper
            projectId={projectId || ''}
            filePath={currentFileName}
            content={fileData.content}
            onChange={(value) => {
              if (currentFileName) {
                updateFileContent(currentFileName, value)
                debouncedSave(value)
              }
            }}
          />
        ) : (
          <Editor
            key={currentTheme}
            height="100%"
            language={getLanguage(currentFileName)}
            value={fileData.content}
            onChange={(value) => {
              if (value !== undefined && currentFileName) {
                updateFileContent(currentFileName, value)
                // Auto-save to database after 1 second of no changes
                debouncedSave(value)
              }
            }}
            beforeMount={(monaco) => {
              // Define Monokai-inspired dark theme
              monaco.editor.defineTheme('monokai', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                  { token: 'comment', foreground: '75715E' },
                  { token: 'string', foreground: 'E6DB74' },
                  { token: 'keyword', foreground: 'F92672' },
                  { token: 'number', foreground: 'AE81FF' },
                  { token: 'regexp', foreground: 'AE81FF' },
                  { token: 'type', foreground: '66D9EF' },
                  { token: 'class', foreground: 'A6E22E' },
                  { token: 'function', foreground: 'A6E22E' },
                  { token: 'variable', foreground: 'F8F8F2' },
                  { token: 'constant', foreground: 'AE81FF' },
                  { token: 'operator', foreground: 'F92672' },
                ],
                colors: {
                  'editor.foreground': '#F8F8F2',
                  'editorLineNumber.foreground': '#90908A',
                }
              })

              // Define better light theme
              monaco.editor.defineTheme('light-plus', {
                base: 'vs',
                inherit: true,
                rules: [
                  { token: 'comment', foreground: '008000' },
                  { token: 'string', foreground: 'A31515' },
                  { token: 'keyword', foreground: '0000FF' },
                  { token: 'number', foreground: '098658' },
                  { token: 'regexp', foreground: '811F3F' },
                  { token: 'type', foreground: '267F99' },
                  { token: 'class', foreground: '267F99' },
                  { token: 'function', foreground: '795E26' },
                  { token: 'variable', foreground: '001080' },
                  { token: 'constant', foreground: '0070C1' },
                  { token: 'operator', foreground: '000000' },
                ],
                colors: {
                  'editor.foreground': '#000000',
                  'editorLineNumber.foreground': '#237893',
                }
              })
            }}
            onMount={(editor, monaco) => {
              editorRef.current = editor
              monacoRef.current = monaco
              // Set initial theme
              const initialTheme = currentTheme === 'dark' ? 'monokai' : 'light-plus'
              monaco.editor.setTheme(initialTheme)
              // Mark editor as ready for collaboration
              setIsEditorReady(true)
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        )}
      </div>
    </div>
  )
}
