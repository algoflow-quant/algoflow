import { useState, useCallback } from "react"
import { GoldenLayout } from "golden-layout"
import { PANEL_REGISTRY } from "./panel-registry"

export function usePanelManager(layoutRef: React.RefObject<GoldenLayout | null>) {
  const [visiblePanels, setVisiblePanels] = useState<Set<string>>(
    new Set(Object.keys(PANEL_REGISTRY).filter(id => PANEL_REGISTRY[id].defaultVisible))
  )

  // Callbacks for workspace to call when panels are added/removed via GoldenLayout events
  const onPanelAdded = useCallback((panelId: string) => {
    console.log('[PanelManager] onPanelAdded:', panelId)
    setVisiblePanels(prev => {
      const next = new Set(prev)
      next.add(panelId)
      console.log('[PanelManager] New visible panels:', Array.from(next))
      return next
    })
  }, [])

  const onPanelRemoved = useCallback((panelId: string) => {
    console.log('[PanelManager] onPanelRemoved:', panelId)
    setVisiblePanels(prev => {
      const next = new Set(prev)
      next.delete(panelId)
      console.log('[PanelManager] New visible panels:', Array.from(next))
      return next
    })
  }, [])

  const isPanelVisible = useCallback((panelId: string) => {
    return visiblePanels.has(panelId)
  }, [visiblePanels])

  const addPanel = useCallback((panelId: string) => {
    console.log('[PanelManager] addPanel called:', panelId)
    const panel = PANEL_REGISTRY[panelId]
    if (!layoutRef.current) {
      console.log('[PanelManager] Cannot add - layout missing')
      return
    }

    try {
      const layout = layoutRef.current as any
      console.log('[PanelManager] Adding component based on default layout position')

      // Default layout: Root Row [FileTree Stack, Column [Editor Stack, Console Stack], Actions Stack]
      // We need to find which existing component to add next to

      // Find the column (middle section)
      const findColumn = (item: any): any => {
        if (item.isColumn) return item
        if (item.contentItems) {
          for (const child of item.contentItems) {
            const found = findColumn(child)
            if (found) return found
          }
        }
        return null
      }

      const column = findColumn(layout.root)

      if (panelId === 'fileTree') {
        // FileTree should go on the left - add to root row at the start
        console.log('[PanelManager] FileTree: adding to root as first child')
        const itemConfig = {
          type: 'stack',
          content: [{
            type: 'component',
            componentType: panelId,
            title: panel.title
          }]
        }
        if (layout.root.addItem) {
          layout.root.addItem(itemConfig, 0)
        } else {
          layout.addComponent(panelId, undefined, panel.title)
        }
      } else if (panelId === 'actions') {
        // Actions should go on the right - add to root row at the end
        console.log('[PanelManager] Actions: adding to root as last child')
        const itemConfig = {
          type: 'stack',
          content: [{
            type: 'component',
            componentType: panelId,
            title: panel.title
          }]
        }
        if (layout.root.addItem) {
          layout.root.addItem(itemConfig)
        } else {
          layout.addComponent(panelId, undefined, panel.title)
        }
      } else if (panelId === 'editor') {
        // Editor goes in the column at the top
        if (column && column.addComponent) {
          console.log('[PanelManager] Editor: adding to column at index 0')
          column.addComponent(panelId, undefined, panel.title, 0)
        } else {
          console.log('[PanelManager] Column not found, using fallback')
          layout.addComponent(panelId, undefined, panel.title)
        }
      } else if (panelId === 'console') {
        // Console goes in the column after editor
        if (column && column.addComponent) {
          console.log('[PanelManager] Console: adding to column at index 1')
          column.addComponent(panelId, undefined, panel.title, 1)
        } else {
          console.log('[PanelManager] Column not found, using fallback')
          layout.addComponent(panelId, undefined, panel.title)
        }
      } else {
        // Default: add to column if it exists, otherwise root
        if (column && column.addComponent) {
          console.log('[PanelManager] Default: adding to column')
          column.addComponent(panelId, undefined, panel.title)
        } else {
          console.log('[PanelManager] No column, using fallback')
          layout.addComponent(panelId, undefined, panel.title)
        }
      }

      console.log('[PanelManager] Panel added successfully')
    } catch (error) {
      console.error('[PanelManager] Error adding panel:', error)
    }
  }, [layoutRef])

  const removePanel = useCallback((panelId: string) => {
    if (!layoutRef.current) return

    try {
      const layout = layoutRef.current as any
      // Find and remove the panel
      const findAndRemove = (item: any): boolean => {
        // Check if this is a component with matching componentType
        if (item.isComponent && item.componentType === panelId) {
          if (item.remove) {
            item.remove()
            return true
          }
        }
        if (item.contentItems) {
          for (const child of item.contentItems) {
            if (findAndRemove(child)) return true
          }
        }
        return false
      }

      if (layout.root) {
        findAndRemove(layout.root)
      }
    } catch (error) {
      console.error('Error removing panel:', error)
    }
  }, [layoutRef])

  const togglePanel = useCallback((panelId: string) => {
    if (visiblePanels.has(panelId)) {
      removePanel(panelId)
    } else {
      addPanel(panelId)
    }
  }, [visiblePanels, addPanel, removePanel])

  const resetLayout = useCallback(() => {
    // Reload page to reset layout
    window.location.reload()
  }, [])

  return {
    visiblePanels,
    isPanelVisible,
    addPanel,
    removePanel,
    togglePanel,
    resetLayout,
    onPanelAdded,
    onPanelRemoved,
  }
}
