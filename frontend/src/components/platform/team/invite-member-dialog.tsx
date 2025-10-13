"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface InviteMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  teamName: string
  onInvite: (identifier: string, identifierType: 'email' | 'username') => Promise<void>
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  teamName,
  onInvite,
}: Omit<InviteMemberDialogProps, 'teamId'>) {
  const [identifierType, setIdentifierType] = React.useState<'email' | 'username'>('email')
  const [identifier, setIdentifier] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim()) return

    setLoading(true)
    try {
      await onInvite(identifier.trim(), identifierType)
      setIdentifier("")
      onOpenChange(false)
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error) || 'Failed to send invite')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Invite someone to join {teamName}. They&apos;ll receive a notification with the invite.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Invite by</Label>
              <Select
                value={identifierType}
                onValueChange={(value: 'email' | 'username') => setIdentifierType(value)}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="username">Username</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="identifier">
                {identifierType === 'email' ? 'Email Address' : 'Username'}
              </Label>
              <Input
                id="identifier"
                type={identifierType === 'email' ? 'email' : 'text'}
                placeholder={identifierType === 'email' ? 'user@example.com' : 'username'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
