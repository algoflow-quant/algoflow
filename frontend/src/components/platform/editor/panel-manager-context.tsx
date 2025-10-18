'use client'

import React, { createContext, useContext } from 'react'
import type { GoldenLayout } from 'golden-layout'

export interface PanelManagerContextType {
  visiblePanels: Set<string>
  visiblePanelsArray: string[] // Array for React to detect changes
  isPanelVisible: (panelId: string) => boolean
  addPanel: (panelId: string) => void
  removePanel: (panelId: string) => void
  togglePanel: (panelId: string) => void
  resetLayout: () => void
  onPanelAdded: (panelId: string) => void
  onPanelRemoved: (panelId: string) => void
}

const PanelManagerContext = createContext<PanelManagerContextType | null>(null)

export function usePanelManagerContext() {
  const context = useContext(PanelManagerContext)
  if (!context) {
    throw new Error('usePanelManagerContext must be used within PanelManagerProvider')
  }
  return context
}

export const PanelManagerProvider = PanelManagerContext.Provider
