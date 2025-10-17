"use client"

import { useEffect, useRef } from "react"
import { createRoot } from "react-dom/client"
import { GoldenLayout, ComponentContainer, LayoutConfig } from "golden-layout"
import { useTheme } from "next-themes"
import { PANEL_REGISTRY } from "./panel-registry"
import { usePanelManager } from "./use-panel-manager"
import { WorkspaceContextMenu } from "./workspace-context-menu"
import "golden-layout/dist/css/goldenlayout-base.css"
import "golden-layout/dist/css/themes/goldenlayout-dark-theme.css"
import "./golden-layout.css"

const defaultLayout: LayoutConfig = {
  root: {
    type: "row",
    content: [
      {
        type: "component",
        componentType: "fileTree",
        title: "Files",
        width: 20,
      },
      {
        type: "column",
        content: [
          {
            type: "component",
            componentType: "editor",
            title: "Editor",
            height: 70,
          },
          {
            type: "component",
            componentType: "console",
            title: "Console",
            height: 30,
          },
        ],
        width: 60,
      },
      {
        type: "component",
        componentType: "actions",
        title: "Actions",
        width: 20,
      },
    ],
  },
}

// Create component constructors for each panel type
const panelConstructors: Record<string, any> = {}

// Store projectId, theme, and layout globally for panel constructors to access
let currentProjectId: string | undefined
let currentTheme: string = "dark"
let globalLayoutRef: { current: GoldenLayout | null } | null = null

// Global theme change listeners
const themeChangeListeners: Set<(theme: string) => void> = new Set()

export function onThemeChange(callback: (theme: string) => void) {
  themeChangeListeners.add(callback)
  // Immediately call with current theme so new listeners get the current state
  callback(currentTheme)
  return () => {
    themeChangeListeners.delete(callback)
  }
}

function notifyThemeChange(theme: string) {
  currentTheme = theme
  themeChangeListeners.forEach(callback => callback(theme))
}

export function getGlobalLayout(): GoldenLayout | null {
  return globalLayoutRef?.current || null
}

Object.keys(PANEL_REGISTRY).forEach((panelId) => {
  panelConstructors[panelId] = function(container: ComponentContainer, state: any) {
    const panel = PANEL_REGISTRY[panelId]
    if (!panel) {
      console.error(`Panel ${panelId} not found in registry`)
      return
    }

    const root = document.createElement("div")
    root.style.height = "100%"
    root.style.width = "100%"
    container.element.appendChild(root)

    const reactRoot = createRoot(root)
    const Component = panel.component as any

    // Component state is passed as second parameter to constructor
    const componentState = state || {}

    console.log('[WorkspaceLayout] Creating panel:', panelId, 'with state:', componentState)

    // Render function to re-render component with updated state
    const render = () => {
      // Check custom state first (for dynamic updates), then initial state
      const currentState = (container as any)._customState || (container as any).state || componentState
      reactRoot.render(
        <Component projectId={currentProjectId} {...currentState} />
      )
    }

    // Initial render
    render()

    // Listen for state changes and re-render
    container.on('stateChanged', render)

    // Return destroy method
    this.destroy = () => {
      container.off('stateChanged', render)
      reactRoot.unmount()
    }
  }
})

interface WorkspaceLayoutProps {
  projectId: string
}

export function WorkspaceLayout({ projectId }: WorkspaceLayoutProps) {
  // Update global projectId when it changes
  currentProjectId = projectId

  const layoutRef = useRef<GoldenLayout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelManager = usePanelManager(layoutRef)
  const { theme } = useTheme()

  // Extract callbacks to avoid dependency issues
  const { onPanelAdded, onPanelRemoved } = panelManager

  // Notify all panels when theme changes
  useEffect(() => {
    if (theme) {
      notifyThemeChange(theme)
    }
  }, [theme])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current

    // Initialize GoldenLayout
    const layout = new GoldenLayout(container)

    // Register all panels from the registry
    Object.keys(PANEL_REGISTRY).forEach((panelId) => {
      layout.registerComponentConstructor(panelId, panelConstructors[panelId])
    })

    // Load default layout
    layout.loadLayout(defaultLayout)

    layoutRef.current = layout
    globalLayoutRef = layoutRef

    // Register panel tracking events AFTER layout is loaded
    console.log('[WorkspaceLayout] Registering panel tracking events')
    layout.on('itemDestroyed', (event: any) => {
      const item = event.target
      console.log('[WorkspaceLayout] Item destroyed:', {
        isComponent: item.isComponent,
        componentType: item.componentType,
        type: item.type
      })

      // Only track component items, not containers
      if (item.isComponent && item.componentType) {
        console.log('[WorkspaceLayout] Component destroyed:', item.componentType)
        onPanelRemoved(item.componentType)
      }
    })

    layout.on('itemCreated', (event: any) => {
      const item = event.target
      console.log('[WorkspaceLayout] Item created:', {
        isComponent: item.isComponent,
        componentType: item.componentType,
        type: item.type
      })

      // Only track component items, not containers
      // Don't track individual editor tabs - only the first editor panel
      if (item.isComponent && item.componentType) {
        // Skip tracking editor tabs after the first one
        if (item.componentType === 'editor') {
          const container = (item as any).container
          const state = container?._customState || container?.state || {}
          // Only track if it's the default empty editor (no fileName)
          if (state.fileName) {
            console.log('[WorkspaceLayout] Skipping editor tab tracking:', state.fileName)
            return
          }
        }

        console.log('[WorkspaceLayout] Component created:', item.componentType)
        onPanelAdded(item.componentType)
      }
    })

    // Listen for maximize/minimize events and force correct dimensions
    layout.on('stateChanged', () => {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        if (containerRef.current && layoutRef.current) {
          const width = containerRef.current.clientWidth
          const height = containerRef.current.clientHeight

          // Force all maximized items to have correct dimensions
          const maximised = containerRef.current.querySelector('.lm_maximised') as HTMLElement
          if (maximised) {
            maximised.style.width = `${width}px`
            maximised.style.height = `${height}px`
          }

          if (width > 0 && height > 0 && height < 100000) {
            try {
              layoutRef.current.updateSize(width, height)
            } catch (e) {
              console.error('[GoldenLayout] State change resize error:', e)
            }
          }
        }
      })
    })

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (layoutRef.current && containerRef.current) {
        // Use clientWidth/clientHeight for accurate dimensions
        const width = containerRef.current.clientWidth
        const height = containerRef.current.clientHeight

        if (width > 0 && height > 0 && height < 100000) { // Sanity check on height
          try {
            layoutRef.current.updateSize(width, height)
          } catch (e) {
            console.error('[GoldenLayout] updateSize error:', e)
          }
        }
      }
    })

    resizeObserver.observe(container)

    // Cleanup
    return () => {
      resizeObserver.disconnect()
      layout.destroy()
    }
  }, [onPanelAdded, onPanelRemoved])

  return (
    <WorkspaceContextMenu
      visiblePanels={panelManager.visiblePanels}
      onTogglePanel={panelManager.togglePanel}
      onResetLayout={panelManager.resetLayout}
    >
      <div ref={containerRef} className="w-full h-full" />
    </WorkspaceContextMenu>
  )
}
