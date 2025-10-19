"use client"

import * as React from "react"
import { IconUsers, IconChevronDown, IconPlus, IconDotsVertical, IconTrash } from "@tabler/icons-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getTeamMembers, inviteTeamMember, removeTeamMember, type TeamMember } from "@/lib/api/teams"
import { InviteMemberDialog } from "./invite-member-dialog"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { usePresenceData } from "@/components/platform/editor/use-project-presence"

interface TeamMembersSectionProps {
  teamId: string
  teamName: string
  currentUserId: string
  isOwner: boolean
}

type TeamMemberWithProfile = TeamMember & {
  profiles: {
    id: string
    name: string | null
    username: string | null
    email: string | null
    avatar_url: string | null
    role: string
  }
}

export function TeamMembersSection({ teamId, teamName, currentUserId, isOwner }: TeamMembersSectionProps) {
  const [members, setMembers] = React.useState<TeamMemberWithProfile[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showInvite, setShowInvite] = React.useState(false)
  const [isKicked, setIsKicked] = React.useState(false)

  // Use the read-only presence hook to get all active users
  // This doesn't change the user's tracked location, only reads presence data
  const { allUsers } = usePresenceData()

  // Create a set of online user IDs from the global presence
  const onlineUsers = React.useMemo(() => {
    const online = new Set<string>()
    allUsers.forEach(user => {
      online.add(user.userId)
    })
    return online
  }, [allUsers])

  React.useEffect(() => {
    if (teamId) {
      setIsKicked(false) // Reset kicked state when team changes
      fetchMembers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId])

  // Listen for kick events
  React.useEffect(() => {
    const handleUserKicked = (event: Event) => {
      const customEvent = event as CustomEvent<{ teamId: string }>
      if (customEvent.detail.teamId === teamId) {
        console.log('[TeamMembersSection] User kicked from this team, hiding section')
        setIsKicked(true)
        setMembers([])
      }
    }

    window.addEventListener('userKickedFromTeam', handleUserKicked as EventListener)
    return () => {
      window.removeEventListener('userKickedFromTeam', handleUserKicked as EventListener)
    }
  }, [teamId])

  // Real-time subscriptions for team members
  React.useEffect(() => {
    if (!teamId) return

    const supabase = createClient()

    const membersChannel = supabase
      .channel(`team-members-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
          filter: `team_id=eq.${teamId}`,
        },
        async (payload) => {
          console.log('[TeamMembers] Change detected:', payload)

          if (payload.eventType === 'INSERT') {
            const newMember = payload.new as TeamMember
            console.log('[TeamMembers] New member joined:', newMember.user_id)
            // Fetch full member data with profile
            await fetchMembers()
            // Show toast notification
            if (newMember.user_id !== currentUserId) {
              toast.success('New team member joined!')
            }
          } else if (payload.eventType === 'UPDATE') {
            console.log('[TeamMembers] Member updated')
            await fetchMembers()
          } else if (payload.eventType === 'DELETE') {
            const deletedMember = payload.old as { id: string }
            console.log('[TeamMembers] DELETE - member id:', deletedMember.id)

            // Use functional update to access current members state
            setMembers(prev => {
              // Find the member in current state before removing
              const memberInState = prev.find(m => m.id === deletedMember.id)
              console.log('[TeamMembers] Found member in state:', memberInState?.user_id, 'currentUser:', currentUserId)

              // Check if it was the current user BEFORE removing
              if (memberInState && memberInState.user_id === currentUserId) {
                console.log('[TeamMembers] *** CURRENT USER KICKED ***')
                // Dispatch event to sidebar
                window.dispatchEvent(new CustomEvent('userKickedFromTeam', {
                  detail: { teamId }
                }))
                toast.error('You were removed from the team')
              } else {
                console.log('[TeamMembers] Other member left')
                toast.info('A team member left')
              }

              // Return filtered list
              return prev.filter(m => m.id !== deletedMember.id)
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('[TeamMembers] Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('[TeamMembers] Successfully subscribed to team members for team:', teamId)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[TeamMembers] Channel error - realtime not enabled on team_members table')
        } else if (status === 'TIMED_OUT') {
          console.error('[TeamMembers] Subscription timed out')
        } else if (status === 'CLOSED') {
          console.log('[TeamMembers] Channel closed')
        }
      })

    return () => {
      supabase.removeChannel(membersChannel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, currentUserId])

  const fetchMembers = async () => {
    try {
      const teamMembers = await getTeamMembers(teamId)
      // Sort members: current user first, then owners, then others
      const sorted = [...teamMembers].sort((a, b) => {
        if (a.user_id === currentUserId) return -1
        if (b.user_id === currentUserId) return 1
        if (a.role === 'owner' && b.role !== 'owner') return -1
        if (b.role === 'owner' && a.role !== 'owner') return 1
        return 0
      })
      setMembers(sorted)
    } catch (error) {
      console.error('Error fetching team members:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (identifier: string, identifierType: 'email' | 'username') => {
    await inviteTeamMember(teamId, teamName, identifier, identifierType)
  }

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeTeamMember(teamId, userId)
      await fetchMembers()
    } catch (error) {
      console.error('Error removing team member:', error)
    }
  }

  // Don't render if user was kicked or no members
  if (isKicked || members.length === 0) {
    console.log('[TeamMembersSection] Rendering nothing - kicked:', isKicked, 'members:', members.length)
    return null
  }

  if (loading) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-brand-blue">
          Team
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <p className="text-xs text-muted-foreground px-2">Loading...</p>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-brand-blue">
        Team
      </SidebarGroupLabel>
      <SidebarMenu>
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className="hover:bg-brand-blue/10">
                <IconUsers className="!size-4 text-brand-blue" />
                <span>Members</span>
                <span className="ml-auto mr-2 text-xs text-brand-blue">
                  {members.length}
                </span>
                <IconChevronDown className="transition-transform group-data-[state=open]/collapsible:rotate-180 !size-4 text-brand-blue" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenuSub>
                  {members.map((member) => {
                    const memberName = member.profiles?.name || 'Unknown'
                    const initials = memberName
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)

                    const canRemove = isOwner && member.role !== 'owner' && member.user_id !== currentUserId
                    const isOnline = onlineUsers.has(member.user_id)

                    return (
                      <SidebarMenuSubItem key={member.id}>
                        <div className="flex items-center w-full gap-1 group/member">
                          <SidebarMenuSubButton className="h-auto py-1.5 hover:bg-brand-blue/10 cursor-default flex-1">
                            <div className="flex items-center gap-2 w-full">
                              <div className="relative">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={member.profiles?.avatar_url || undefined} />
                                  <AvatarFallback className="bg-brand-blue/10 text-brand-blue text-[10px]">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div
                                  className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background ${
                                    isOnline ? 'bg-green-500' : 'bg-gray-400'
                                  }`}
                                  title={isOnline ? 'Online' : 'Offline'}
                                />
                              </div>
                              <div className="flex items-center justify-between w-full">
                                <span className="text-xs font-medium truncate">
                                  {memberName}
                                </span>
                                {member.role === 'owner' && (
                                  <span className="text-[10px] text-muted-foreground ml-auto">
                                    owner
                                  </span>
                                )}
                              </div>
                            </div>
                          </SidebarMenuSubButton>
                          {canRemove && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="opacity-0 group-hover/member:opacity-100 h-6 w-6 flex items-center justify-center rounded hover:bg-accent transition-opacity">
                                  <IconDotsVertical className="h-3 w-3" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" side="bottom">
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive cursor-pointer"
                                  onClick={() => handleRemoveMember(member.user_id)}
                                >
                                  <IconTrash className="mr-2 h-4 w-4" />
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </SidebarMenuSubItem>
                    )
                  })}
                  {isOwner && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton onClick={() => setShowInvite(true)}>
                        <IconPlus className="mr-2 !size-4" />
                        Invite Member
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}
                </SidebarMenuSub>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>

      <InviteMemberDialog
        open={showInvite}
        onOpenChange={setShowInvite}
        teamName={teamName}
        onInvite={handleInvite}
      />
    </SidebarGroup>
  )
}
