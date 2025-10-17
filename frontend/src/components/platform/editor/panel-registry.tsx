import { IconFolder, IconCode, IconTerminal, IconRocket } from "@tabler/icons-react"
import { FileTreePanel } from "./file-tree-panel"
import { CodeEditorPanel } from "./code-editor-panel"
import { ConsolePanel } from "./console-panel"
import { ActionsPanel } from "./actions-panel"

export interface PanelDefinition {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  component: React.ComponentType
  category: 'editor' | 'tools' | 'terminal'
  defaultVisible: boolean
}

export const PANEL_REGISTRY: Record<string, PanelDefinition> = {
  fileTree: {
    id: "fileTree",
    title: "Files",
    icon: IconFolder,
    component: FileTreePanel,
    category: "tools",
    defaultVisible: true,
  },
  editor: {
    id: "editor",
    title: "Editor",
    icon: IconCode,
    component: CodeEditorPanel,
    category: "editor",
    defaultVisible: true,
  },
  console: {
    id: "console",
    title: "Console",
    icon: IconTerminal,
    component: ConsolePanel,
    category: "terminal",
    defaultVisible: true,
  },
  actions: {
    id: "actions",
    title: "Actions",
    icon: IconRocket,
    component: ActionsPanel,
    category: "tools",
    defaultVisible: true,
  },
}

export function getPanelById(id: string): PanelDefinition | undefined {
  return PANEL_REGISTRY[id]
}

export function getAllPanels(): PanelDefinition[] {
  return Object.values(PANEL_REGISTRY)
}

export function getPanelsByCategory(category: PanelDefinition['category']): PanelDefinition[] {
  return Object.values(PANEL_REGISTRY).filter(p => p.category === category)
}

export function getDefaultPanels(): PanelDefinition[] {
  return Object.values(PANEL_REGISTRY).filter(p => p.defaultVisible)
}
