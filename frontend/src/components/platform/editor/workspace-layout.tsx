"use client"

import { useEffect, useRef, useMemo } from "react"
import { createRoot } from "react-dom/client"
import { GoldenLayout, ComponentContainer, LayoutConfig } from "golden-layout"
import { useTheme } from "next-themes"
import { PANEL_REGISTRY } from "./panel-registry"
import { WorkspaceContextMenu } from "./workspace-context-menu"
import { PanelManagerProvider, usePanelManagerContext } from "./panel-manager-context"
import { usePanelManager } from "./use-panel-manager"
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
        width: 15,
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
        width: 70,
      },
      {
        type: "component",
        componentType: "actions",
        title: "Actions",
        width: 15,
      },
    ],
  },
  settings: {
    popoutWholeStack: false, // Only popout active component, not whole stack
    blockedPopoutsThrowError: false, // Don't throw errors if popup blocked
    closePopoutsOnUnload: true, // Close popouts when main window closes
  },
}

// Create component constructors for each panel type
const panelConstructors: Record<string, unknown> = {}

// Store projectId, theme, layout, and panelManager globally for panel constructors to access
let currentProjectId: string | undefined
let currentTheme: string = "dark"
let globalLayoutRef: { current: GoldenLayout | null } | null = null
let globalPanelManager: ReturnType<typeof usePanelManager> | null = null

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
  panelConstructors[panelId] = function(container: ComponentContainer, state: Record<string, unknown>) {
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
    const Component = panel.component as React.ComponentType<{ projectId?: string; [key: string]: unknown }>

    // Component state is passed as second parameter to constructor
    const componentState = state || {}

    // Render function to re-render component with updated state
    const render = () => {
      // Check custom state first (for dynamic updates), then initial state
      interface ContainerWithCustomState {
        _customState?: Record<string, unknown>
        state?: Record<string, unknown>
      }
      const extendedContainer = container as ComponentContainer & ContainerWithCustomState
      const currentState = extendedContainer._customState || extendedContainer.state || componentState

      // Wrap component with PanelManagerProvider if available
      const component = globalPanelManager ? (
        <PanelManagerProvider value={globalPanelManager}>
          <Component projectId={currentProjectId} {...currentState} />
        </PanelManagerProvider>
      ) : (
        <Component projectId={currentProjectId} {...currentState} />
      )

      reactRoot.render(component)
    }

    // Initial render
    render()

    // Listen for state changes and re-render
    container.on('stateChanged', render)

    // Listen for tab activation - dispatch event when editor tabs are selected
    container.on('shown', () => {
      if (panelId === 'editor') {
        const extendedContainer = container as ComponentContainer & { _customState?: { fileName?: string }; state?: { fileName?: string } }
        const currentState = extendedContainer._customState || extendedContainer.state || componentState
        const fileName = currentState.fileName

        if (fileName && typeof fileName === 'string') {
          // Dispatch custom event that CodeEditorPanel will listen to
          window.dispatchEvent(new CustomEvent('editor-tab-activated', { detail: { fileName } }))
        }
      }
    })

    // Return destroy method
    interface ConstructorContext {
      destroy?: () => void
    }
    (this as ConstructorContext).destroy = () => {
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

  // Store panelManager globally so panel constructors can access it
  globalPanelManager = panelManager

  // Extract callbacks to avoid dependency issues
  const { onPanelAdded, onPanelRemoved } = panelManager

  // Notify all panels when theme changes
  useEffect(() => {
    if (theme) {
      notifyThemeChange(theme)
    }
  }, [theme])

  // Force re-render of all GoldenLayout panels when visiblePanelsArray changes
  useEffect(() => {
    if (!layoutRef.current) return

    console.log('[WorkspaceLayout] visiblePanelsArray changed, triggering panel re-renders')

    // Trigger stateChanged event on all containers to force re-render
    const layout = layoutRef.current as any
    if (layout.root && layout.root.contentItems) {
      const triggerRerender = (items: any[]) => {
        items.forEach((item: any) => {
          if (item.isComponent && item.container) {
            // Emit stateChanged to trigger the render callback
            item.container.emit('stateChanged')
          }
          if (item.contentItems) {
            triggerRerender(item.contentItems)
          }
        })
      }
      triggerRerender([layout.root])
    }
  }, [panelManager.visiblePanelsArray])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current

    // Initialize GoldenLayout
    const layout = new GoldenLayout(container)

    // Register all panels from the registry BEFORE checking for popout
    Object.keys(PANEL_REGISTRY).forEach((panelId) => {
      layout.registerComponentConstructor(panelId, panelConstructors[panelId] as never)
    })

    // Load the default layout
    layout.loadLayout(defaultLayout)

    layoutRef.current = layout
    globalLayoutRef = layoutRef

    // Type for layout item with component properties
    interface LayoutItem {
      isComponent?: boolean
      componentType?: string
      container?: {
        _customState?: Record<string, unknown>
        state?: Record<string, unknown>
      }
    }

    // Register panel tracking events AFTER layout is loaded
    layout.on('itemDestroyed', (event: { target: unknown }) => {
      const item = event.target as LayoutItem

      // Only track component items, not containers
      if (item.isComponent && item.componentType) {
        onPanelRemoved(item.componentType)
      }
    })

    layout.on('itemCreated', (event: { target: unknown }) => {
      const item = event.target as LayoutItem

      // Only track component items, not containers
      // Don't track individual editor tabs - only the first editor panel
      if (item.isComponent && item.componentType) {
        // Skip tracking editor tabs after the first one
        if (item.componentType === 'editor') {
          const container = item.container
          const state = container?._customState || container?.state || {}
          // Only track if it's the default empty editor (no fileName)
          if (state.fileName) {
            return
          }
        }

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

  // Create a new context value when visiblePanelsArray changes to trigger re-renders
  // Use the array join as a key to force re-creation when it changes
  const panelArrayKey = panelManager.visiblePanelsArray.join(',')
  const contextValue = useMemo(() => panelManager, [panelArrayKey])

  return (
    <PanelManagerProvider value={contextValue}>
      <WorkspaceContextMenu
        visiblePanels={panelManager.visiblePanels}
        onTogglePanel={panelManager.togglePanel}
        onResetLayout={panelManager.resetLayout}
      >
        <div ref={containerRef} className="w-full h-full" />
      </WorkspaceContextMenu>
    </PanelManagerProvider>
  )
}
