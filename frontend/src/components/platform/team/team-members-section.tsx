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

  React.useEffect(() => {
    if (teamId) {
      fetchMembers()
    }
  }, [teamId])

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

                    return (
                      <SidebarMenuSubItem key={member.id}>
                        <div className="flex items-center w-full gap-1 group/member">
                          <SidebarMenuSubButton className="h-auto py-1.5 hover:bg-brand-blue/10 cursor-default flex-1">
                            <div className="flex items-center gap-2 w-full">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={member.profiles?.avatar_url || undefined} />
                                <AvatarFallback className="bg-brand-blue/10 text-brand-blue text-[10px]">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
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
        teamId={teamId}
        teamName={teamName}
        onInvite={handleInvite}
      />
    </SidebarGroup>
  )
}
