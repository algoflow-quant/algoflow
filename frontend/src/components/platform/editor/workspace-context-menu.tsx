"use client"

import * as React from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuCheckboxItem,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "@/components/ui/context-menu"
import { IconLayoutGrid, IconEye } from "@tabler/icons-react"
import { getAllPanels } from "./panel-registry"

interface WorkspaceContextMenuProps {
  children: React.ReactNode
  visiblePanels: Set<string>
  onTogglePanel: (panelId: string) => void
  onResetLayout: () => void
}

export function WorkspaceContextMenu({
  children,
  visiblePanels,
  onTogglePanel,
  onResetLayout,
}: WorkspaceContextMenuProps) {
  const allPanels = getAllPanels()

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <IconEye className="mr-2 h-4 w-4" />
            Panels
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {allPanels.map((panel) => {
              const Icon = panel.icon
              return (
                <ContextMenuCheckboxItem
                  key={panel.id}
                  checked={visiblePanels.has(panel.id)}
                  onCheckedChange={() => onTogglePanel(panel.id)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {panel.title}
                </ContextMenuCheckboxItem>
              )
            })}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onResetLayout}>
          <IconLayoutGrid className="mr-2 h-4 w-4" />
          Reset Layout
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
