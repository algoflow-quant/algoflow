'use client';

import { useRef, useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useNotebookCollab } from './use-notebook-collab';

interface NotebookCellEditorProps {
  projectId: string;
  fileName: string;
  cellId: string;
  value: string;
  language: 'python' | 'markdown';
  theme: string;
  onChange: (value: string) => void;
  height?: string;
}

export function NotebookCellEditor({
  projectId,
  fileName,
  cellId,
  value,
  language,
  theme,
  onChange,
  height = '80px'
}: NotebookCellEditorProps) {
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  // Enable real-time collaboration for this cell
  const { myColor } = useNotebookCollab({
    projectId,
    fileName,
    cellId,
    editor: isEditorReady ? editorRef.current : null,
    monaco: isEditorReady ? monacoRef.current : null
  });

  // Handle editor mount
  const handleEditorDidMount = (
    editor: import('monaco-editor').editor.IStandaloneCodeEditor,
    monaco: typeof import('monaco-editor')
  ) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setIsEditorReady(true);

    // Add cursor indicator for the current user
    editor.updateOptions({
      cursorStyle: 'line',
      cursorBlinking: 'blink',
    });
  };

  // Define themes before editor loads
  const handleBeforeMount = (monaco: typeof import('monaco-editor')) => {
    // Define Monokai theme for dark mode
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
        'editor.background': '#272822',
        'editorCursor.foreground': '#F8F8F0',
        'editor.lineHighlightBackground': '#3E3D32',
        'editorLineNumber.foreground': '#90908A',
      },
    });

    // Define light theme
    monaco.editor.defineTheme('github-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'string', foreground: 'A31515' },
        { token: 'keyword', foreground: '0000FF' },
        { token: 'number', foreground: '098658' },
      ],
      colors: {
        'editor.foreground': '#000000',
        'editor.background': '#FFFFFF',
      },
    });
  };

  return (
    <Editor
      key={`${cellId}-${theme}`}
      height={height}
      language={language}
      value={value}
      onChange={(newValue) => onChange(newValue || '')}
      beforeMount={handleBeforeMount}
      onMount={handleEditorDidMount}
      theme={theme === 'dark' ? 'monokai' : 'github-light'}
      options={{
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineNumbers: 'on',
        renderLineHighlight: 'line',
        scrollbar: {
          vertical: 'hidden',
          horizontal: 'auto',
          verticalScrollbarSize: 0,
        },
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        overviewRulerBorder: false,
        wordWrap: 'on',
        automaticLayout: true,
      }}
    />
  );
}
