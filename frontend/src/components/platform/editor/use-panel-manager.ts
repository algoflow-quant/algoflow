'use client'

import { useState, useCallback, MutableRefObject } from 'react'
import type { GoldenLayout } from 'golden-layout'

export function usePanelManager(layoutRef: MutableRefObject<GoldenLayout | null>) {
  const [visiblePanels, setVisiblePanels] = useState<Set<string>>(new Set())
  const [visiblePanelsArray, setVisiblePanelsArray] = useState<string[]>([])

  const isPanelVisible = useCallback((panelId: string) => {
    return visiblePanels.has(panelId)
  }, [visiblePanels])

  const addPanel = useCallback((panelId: string) => {
    setVisiblePanels(prev => {
      const next = new Set(prev)
      next.add(panelId)
      setVisiblePanelsArray(Array.from(next))
      return next
    })
  }, [])

  const removePanel = useCallback((panelId: string) => {
    setVisiblePanels(prev => {
      const next = new Set(prev)
      next.delete(panelId)
      setVisiblePanelsArray(Array.from(next))
      return next
    })
  }, [])

  const togglePanel = useCallback((panelId: string) => {
    if (isPanelVisible(panelId)) {
      removePanel(panelId)
    } else {
      addPanel(panelId)
    }
  }, [isPanelVisible, addPanel, removePanel])

  const resetLayout = useCallback(() => {
    setVisiblePanels(new Set())
    setVisiblePanelsArray([])
  }, [])

  const onPanelAdded = useCallback((panelId: string) => {
    addPanel(panelId)
  }, [addPanel])

  const onPanelRemoved = useCallback((panelId: string) => {
    removePanel(panelId)
  }, [removePanel])

  return {
    visiblePanels,
    visiblePanelsArray,
    isPanelVisible,
    addPanel,
    removePanel,
    togglePanel,
    resetLayout,
    onPanelAdded,
    onPanelRemoved
  }
}