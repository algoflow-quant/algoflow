"use client"

import { IconPlayerPlay, IconRocket } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

interface ActionsPanelProps {
  projectId?: string
}

export function ActionsPanel(_props: ActionsPanelProps = {}) {
  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      <div className="p-3 border-b border-border flex-shrink-0">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <IconRocket className="h-4 w-4 text-brand-blue" />
          Actions
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3">
        {/* Action buttons */}
        <Button className="w-full" disabled>
          <IconPlayerPlay className="h-4 w-4 mr-2" />
          Run Cell
        </Button>
        <div className="text-xs text-muted-foreground pt-2">
          <p>Kernel: Not connected</p>
        </div>
      </div>
    </div>
  )
}
