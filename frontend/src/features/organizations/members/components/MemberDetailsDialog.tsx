'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserMinus, UserCog } from 'lucide-react'
import type { OrganizationMember } from '../types'
import { formatDistanceToNow } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import { removeMember, updateMemberRole } from '../actions/manageMember'
import { useOrgRole } from '@/providers/RoleProvider'
import { useCurrentUser } from '../queries/useCurrentUser'

interface MemberDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: OrganizationMember
  isOnline: boolean
}

export default function MemberDetailsDialog({
  open,
  onOpenChange,
  member,
  isOnline,
}: MemberDetailsDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const queryClient = useQueryClient()

  // Get user role from context
  const { isOwner, isModerator } = useOrgRole()
  const { user } = useCurrentUser()

  // Determine if current user can manage this member
  const canRemove =
    user?.id !== member.user_id && // Can't remove yourself
    member.role !== 'owner' && // Can't remove owner
    (isOwner || isModerator) // Owner or moderator can remove

  const canPromote =
    user?.id !== member.user_id && // Can't promote yourself
    isOwner && // Only owners can promote
    member.role !== 'owner' // Can't promote an owner

  const handleRemove = async () => {
    if (!canRemove) return

    setIsProcessing(true)
    try {
      await removeMember(member.organization_id, member.user_id)
      await queryClient.invalidateQueries({ queryKey: ['organization-members', member.organization_id] })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to remove member:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePromoteDemote = async () => {
    if (!canPromote) return

    setIsProcessing(true)
    try {
      const newRole = member.role === 'moderator' ? 'member' : 'moderator'
      await updateMemberRole(member.organization_id, member.user_id, newRole)
      await queryClient.invalidateQueries({ queryKey: ['organization-members', member.organization_id] })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to change role:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'moderator':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      default:
        return 'bg-muted text-muted-foreground border-muted-foreground/20'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Member Details</DialogTitle>
          <DialogDescription>View and manage organization member</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          {/* Profile Section */}
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={member.profiles.avatar_url || undefined} alt={member.profiles.username} />
                <AvatarFallback>{member.profiles.username[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              {isOnline && (
                <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg truncate">
                  {member.profiles.full_name || member.profiles.username}
                </h3>
                <Badge variant="outline" className={getRoleBadgeColor(member.role)}>
                  {member.role}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">@{member.profiles.username}</p>
              <p className="text-sm text-muted-foreground">{member.profiles.email}</p>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Joined</p>
              <p className="text-sm font-medium">
                {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-sm font-medium">
                {isOnline ? (
                  <span className="text-green-500">Online</span>
                ) : member.profiles.last_seen_at ? (
                  <span>Last seen {formatDistanceToNow(new Date(member.profiles.last_seen_at), { addSuffix: true })}</span>
                ) : (
                  <span className="text-muted-foreground">Offline</span>
                )}
              </p>
            </div>
          </div>

          {/* Actions Section */}
          {(canRemove || canPromote) && (
            <div className="flex gap-3 pt-4 border-t">
              {canPromote && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handlePromoteDemote}
                  disabled={isProcessing}
                >
                  <UserCog className="h-4 w-4 mr-2" />
                  {member.role === 'moderator' ? 'Demote to Member' : 'Promote to Moderator'}
                </Button>
              )}
              {canRemove && (
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleRemove}
                  disabled={isProcessing}
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
