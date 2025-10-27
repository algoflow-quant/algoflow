'use client'

// react imports
import { useState } from 'react'

// component impoorts
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Loading animation
import LoadingAnimation from '@/components/shared/LoadingAnimation'

// tanstack query client
import { useQueryClient } from '@tanstack/react-query'

// server action
import { sendInvitation } from '../actions/sendInvitation'

interface InviteMemberDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    organizationId: string
    userRole: 'owner' | 'moderator' | 'member'
}

export default function InviteMemberDialog({
    open,
    onOpenChange,
    organizationId,
    userRole
}: InviteMemberDialogProps) {
    const [email, setEmail] = useState('') // email state
    const [role, setRole] = useState<'member' | 'moderator'>('member') // role state
    const [isLoading, setIsLoading] = useState(false) // loading state
    const [error, setError] = useState<string | null>(null) // error state
    const queryClient = useQueryClient() // tanstack query client

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        try {
            // Call server action to send invitation
            await sendInvitation({
                organizationId,
                email,
                role
            })

            // Reset form
            setEmail('')
            setRole('member')
            onOpenChange(false)

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['organization-invitations', organizationId] })
            queryClient.invalidateQueries({ queryKey: ['organization-members', organizationId] })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send invitation')
        } finally {
            setIsLoading(false)
        }
    }
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>
                Send an invitation to join your organization
            </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                id="email"
                type="email"
                placeholder="member@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                />
            </div>

            {/* Role Select */}
            <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                value={role}
                onValueChange={(value) => setRole(value as 'member' | 'moderator')}
                disabled={isLoading || userRole === 'moderator'}
                >
                <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    {userRole === 'owner' && (
                    <SelectItem value="moderator">Moderator</SelectItem>
                    )}
                </SelectContent>
                </Select>
                {userRole === 'moderator' && (
                <p className="text-xs text-muted-foreground">
                    Moderators can only invite members
                </p>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
                <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                >
                Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                {isLoading ? <LoadingAnimation /> : 'Send Invitation'}
                </Button>
            </div>
            </form>
        </DialogContent>
        </Dialog>
    )
}