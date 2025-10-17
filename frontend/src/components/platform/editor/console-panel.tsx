"use client"

import { IconTerminal } from "@tabler/icons-react"

interface ConsolePanelProps {
  projectId?: string
}

export function ConsolePanel({ projectId }: ConsolePanelProps = {}) {
  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      <div className="p-3 border-b border-border flex-shrink-0">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <IconTerminal className="h-4 w-4 text-brand-blue" />
          Console
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-black/90 text-green-400 font-mono text-xs p-4">
        {/* Console output will go here */}
        <p className="opacity-50">Kernel not connected</p>
      </div>
    </div>
  )
}
