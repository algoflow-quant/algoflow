'use client'

import * as React from 'react'
import {
  Bell,
  User,
  Lock,
  Palette,
  Globe,
  Keyboard,
} from 'lucide-react'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar'

import { AccountSettings } from './sections/AccountSettings'
import { AppearanceSettings } from './sections/AppearanceSettings'
import { NotificationSettings } from './sections/NotificationSettings'
import { PrivacySettings } from './sections/PrivacySettings'
import { PreferencesSettings } from './sections/PreferencesSettings'
import { AccessibilitySettings } from './sections/AccessibilitySettings'

type SettingsSection =
  | 'account'
  | 'appearance'
  | 'notifications'
  | 'privacy'
  | 'preferences'
  | 'accessibility'

const settingsSections = [
  { id: 'account', name: 'Account', icon: User },
  { id: 'appearance', name: 'Appearance', icon: Palette },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'privacy', name: 'Privacy & Security', icon: Lock },
  { id: 'preferences', name: 'Preferences', icon: Globe },
  { id: 'accessibility', name: 'Accessibility', icon: Keyboard },
] as const

interface UserSettingsDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultSection?: SettingsSection
  trigger?: React.ReactNode
}

export function UserSettingsDialog({
  open: controlledOpen,
  onOpenChange,
  defaultSection = 'account',
  trigger,
}: UserSettingsDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [activeSection, setActiveSection] =
    React.useState<SettingsSection>(defaultSection)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? onOpenChange : setInternalOpen

  const renderSection = () => {
    switch (activeSection) {
      case 'account':
        return <AccountSettings />
      case 'appearance':
        return <AppearanceSettings />
      case 'notifications':
        return <NotificationSettings />
      case 'privacy':
        return <PrivacySettings />
      case 'preferences':
        return <PreferencesSettings />
      case 'accessibility':
        return <AccessibilitySettings />
      default:
        return <AccountSettings />
    }
  }

  const activeSectionName =
    settingsSections.find((s) => s.id === activeSection)?.name || 'Account'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="overflow-hidden p-0 md:max-h-[600px] md:max-w-[700px] lg:max-w-[900px]">
        <DialogTitle className="sr-only">User Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Customize your user settings and preferences.
        </DialogDescription>
        <SidebarProvider className="items-start">
          <Sidebar collapsible="none" className="hidden md:flex">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {settingsSections.map((section) => (
                      <SidebarMenuItem key={section.id}>
                        <SidebarMenuButton
                          isActive={activeSection === section.id}
                          onClick={() =>
                            setActiveSection(section.id as SettingsSection)
                          }
                        >
                          <section.icon />
                          <span>{section.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex h-[560px] flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
              <div className="flex items-center gap-2 px-4">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink
                        onClick={() => setActiveSection('account')}
                        className="cursor-pointer"
                      >
                        Settings
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{activeSectionName}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>
            <div className="flex flex-1 flex-col overflow-y-auto p-6">
              {renderSection()}
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}
