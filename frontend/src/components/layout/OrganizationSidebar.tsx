'use client'

import React, { useState } from 'react'
import { useParams, usePathname } from 'next/navigation'
import { useNavigation } from '@/providers/NavigationProvider'
import { Settings, DollarSign, BarChart3, Users, FolderKanban, LayoutDashboard } from 'lucide-react'
import { Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

type SidebarMode = 'closed' | 'hover' | 'open'

export default function OrgSidebar() {
  const params = useParams()
  const pathname = usePathname()
  const orgId = params?.organizationId as string
  const { isNavigating, navigate } = useNavigation()

  const [mode, setMode] = useState<SidebarMode>('hover')
  const [isHovered, setIsHovered] = useState(false)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [pendingPath, setPendingPath] = useState<string | null>(null)

  const isExpanded = mode === 'open' || (mode === 'hover' && isHovered)

  const handleNavigation = (href: string) => {
    setPendingPath(href)
    navigate(href)
  }

  // Sidebar links, names and icons
  const navItems = [
    { icon: LayoutDashboard, label: 'Overview', href: `/dashboard/${orgId}` },
    { icon: FolderKanban, label: 'Projects', href: `/dashboard/${orgId}/projects` },
    { icon: Users, label: 'Members', href: `/dashboard/${orgId}/members` },
    { icon: BarChart3, label: 'Usage', href: `/dashboard/${orgId}/usage` },
    { icon: DollarSign, label: 'Billing', href: `/dashboard/${orgId}/billing` },
    { icon: Settings, label: 'Settings', href: `/dashboard/${orgId}/settings` },
  ]
  return (
    <div
      className={cn(
        'fixed left-0 bg-background border-r h-[calc(100vh-52px)] border-muted transition-all duration-200 z-40 flex flex-col justify-between',
        isExpanded ? 'w-54' : 'w-13',
        mode === 'hover' && isExpanded && 'shadow-lg'
      )}
      onMouseEnter={() => mode === 'hover' && setIsHovered(true)}
      onMouseLeave={() => mode === 'hover' && setIsHovered(false)}
    >
      {/* Navigation links */}
      <nav className="p-2 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href
          const isLoading = isNavigating && pendingPath === item.href

          return (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              disabled={isLoading}
              className={cn(
                'w-full p-2 rounded-md transition-colors flex items-center text-sm cursor-pointer',
                isActive
                  ? 'bg-muted text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground',
                isLoading && 'opacity-50 cursor-wait'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0 ml-[1px]" />
              <span
                className={cn(
                  'ml-3 whitespace-nowrap transition-opacity duration-200',
                  isExpanded ? 'opacity-100' : 'opacity-0 w-0'
                )}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Sidebar control button at bottom */}
      <div className="p-2 flex justify-start">
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'p-2 rounded-md transition-colors hover:bg-muted flex items-center justify-center cursor-pointer'
              )}
              title="Sidebar settings"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </PopoverTrigger>

          <PopoverContent side="right" align="end" className="w-48 bg-card">
            <div className="space-y-1">
              <p className="text-xs font-medium mb-2">Sidebar Control</p>

              <Separator />

              <button
                onClick={() => {
                  setMode('closed')
                  setIsPopoverOpen(false)
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs rounded-md transition-colors flex items-center gap-2 cursor-pointer',
                  mode === 'closed' ? 'bg-accent text-primary-foreground' : 'hover:bg-accent'
                )}
              >
                <div
                  className={cn(
                    'h-2 w-2 rounded-full bg-white',
                    mode === 'closed' ? 'opacity-100' : 'opacity-0'
                  )}
                />
                Icon only
              </button>

              <button
                onClick={() => {
                  setMode('hover')
                  setIsPopoverOpen(false)
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs rounded-md transition-colors flex items-center gap-2 cursor-pointer',
                  mode === 'hover' ? 'bg-accent text-primary-foreground' : 'hover:bg-accent'
                )}
              >
                <div
                  className={cn(
                    'h-2 w-2 rounded-full bg-white',
                    mode === 'hover' ? 'opacity-100' : 'opacity-0'
                  )}
                />
                Expand on hover
              </button>

              <button
                onClick={() => {
                  setMode('open')
                  setIsPopoverOpen(false)
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs rounded-md transition-colors flex items-center gap-2 cursor-pointer',
                  mode === 'open' ? 'bg-accent text-primary-foreground' : 'hover:bg-accent'
                )}
              >
                <div
                  className={cn(
                    'h-2 w-2 rounded-full bg-white',
                    mode === 'open' ? 'opacity-100' : 'opacity-0'
                  )}
                />
                Always open
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
