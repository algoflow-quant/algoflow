"use client"

import Editor from "@monaco-editor/react"
import { useWorkspace } from "./workspace-context"
import { useRef, useEffect, useState } from "react"
import { onThemeChange } from "./workspace-layout"

interface CodeEditorPanelProps {
  projectId?: string
  fileName?: string
}

export function CodeEditorPanel({ projectId, fileName }: CodeEditorPanelProps = {}) {
  const { openFiles, updateFileContent } = useWorkspace()
  const monacoRef = useRef<any>(null)
  const [currentTheme, setCurrentTheme] = useState<string>('dark')

  console.log('[CodeEditorPanel] Rendered with fileName:', fileName, 'openFiles:', openFiles.length)

  // Get the file data - use fileName prop if provided, otherwise use activeFile
  const fileData = openFiles.find(f => f.fileName === fileName)

  // Listen for theme changes from workspace-layout
  useEffect(() => {
    const unsubscribe = onThemeChange((theme) => {
      setCurrentTheme(theme)
    })
    return unsubscribe
  }, [])

  const getLanguage = (fileName: string) => {
    if (fileName.endsWith('.py')) return 'python'
    if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return 'javascript'
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return 'typescript'
    if (fileName.endsWith('.json')) return 'json'
    if (fileName.endsWith('.ipynb')) return 'json'
    return 'plaintext'
  }

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      <div className="flex-1 overflow-hidden bg-background">
        {!fileName || !fileData ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No file selected
          </div>
        ) : (
          <Editor
            key={currentTheme}
            height="100%"
            language={getLanguage(fileName)}
            value={fileData.content}
            onChange={(value) => {
              if (value !== undefined && fileName) {
                updateFileContent(fileName, value)
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
            onMount={(_editor, monaco) => {
              monacoRef.current = monaco
              // Set initial theme
              const initialTheme = currentTheme === 'dark' ? 'monokai' : 'light-plus'
              monaco.editor.setTheme(initialTheme)
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
