"use client"

import { useState, useEffect } from "react"

export interface OpenFile {
  fileName: string
  content: string
  isDirty: boolean
}

interface WorkspaceState {
  openFiles: OpenFile[]
  activeFile: string | null
}

// Global workspace state shared across all panels
class WorkspaceManager {
  private state: WorkspaceState = {
    openFiles: [],
    activeFile: null
  }
  private listeners = new Set<() => void>()

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getState(): WorkspaceState {
    return this.state
  }

  addFile(fileName: string, content: string) {
    // Check if file is already open
    if (this.state.openFiles.some(f => f.fileName === fileName)) {
      this.setActiveFile(fileName)
      return
    }

    this.state = {
      ...this.state,
      openFiles: [...this.state.openFiles, { fileName, content, isDirty: false }],
      activeFile: fileName
    }
    this.notify()
  }

  removeFile(fileName: string) {
    const newOpenFiles = this.state.openFiles.filter(f => f.fileName !== fileName)
    const newActiveFile = this.state.activeFile === fileName
      ? (newOpenFiles.length > 0 ? newOpenFiles[0].fileName : null)
      : this.state.activeFile

    this.state = {
      openFiles: newOpenFiles,
      activeFile: newActiveFile
    }
    this.notify()
  }

  setActiveFile(fileName: string) {
    this.state = {
      ...this.state,
      activeFile: fileName
    }
    this.notify()
  }

  updateFileContent(fileName: string, content: string) {
    this.state = {
      ...this.state,
      openFiles: this.state.openFiles.map(f =>
        f.fileName === fileName
          ? { ...f, content, isDirty: true }
          : f
      )
    }
    this.notify()
  }

  private notify() {
    this.listeners.forEach(listener => listener())
  }
}

const workspaceManager = new WorkspaceManager()

export function useWorkspace() {
  const [state, setState] = useState(workspaceManager.getState())

  useEffect(() => {
    const unsubscribe = workspaceManager.subscribe(() => {
      setState(workspaceManager.getState())
    })
    return () => {
      unsubscribe()
    }
  }, [])

  return {
    openFiles: state.openFiles,
    activeFile: state.activeFile,
    addFile: (fileName: string, content: string) => workspaceManager.addFile(fileName, content),
    removeFile: (fileName: string) => workspaceManager.removeFile(fileName),
    setActiveFile: (fileName: string) => workspaceManager.setActiveFile(fileName),
    updateFileContent: (fileName: string, content: string) => workspaceManager.updateFileContent(fileName, content)
  }
}
