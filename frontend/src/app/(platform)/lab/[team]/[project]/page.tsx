"use client"

import { use } from "react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { IconFolder } from "@tabler/icons-react"

export default function ProjectPage({ params }: { params: Promise<{ team: string; project: string }> }) {
  // Resolve params for future use
  use(params)

  return (
    <div className="flex flex-col h-full">
      {/* Main content area with resizable panels */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left sidebar - File tree */}
        <ResizablePanel defaultSize={20} minSize={10}>
          <div className="flex flex-col h-full border-r border-border bg-background/50">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <IconFolder className="h-4 w-4 text-brand-blue" />
                Files
              </h3>
            </div>
            <div className="flex-1 overflow-auto">
              {/* Empty file tree */}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Middle area - Code editor and console */}
        <ResizablePanel defaultSize={60} minSize={30}>
          <ResizablePanelGroup direction="vertical">
            {/* Code editor area */}
            <ResizablePanel defaultSize={70} minSize={20}>
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-border bg-background/50">
                  <h3 className="font-semibold text-sm">Editor</h3>
                </div>
                <div className="flex-1 overflow-auto bg-muted/20">
                  {/* Empty editor */}
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Bottom console */}
            <ResizablePanel defaultSize={30} minSize={10}>
              <div className="flex flex-col h-full border-t border-border">
                <div className="p-4 border-b border-border bg-background/50">
                  <h3 className="font-semibold text-sm">Console</h3>
                </div>
                <div className="flex-1 overflow-auto bg-black/90 text-green-400 font-mono text-xs p-4">
                  {/* Empty console */}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right sidebar - Actions and options */}
        <ResizablePanel defaultSize={20} minSize={10}>
          <div className="flex flex-col h-full border-l border-border bg-background/50">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-sm">Actions</h3>
            </div>
            <div className="flex-1 overflow-auto">
              {/* Empty actions panel */}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
