'use client'

// React imports
import React, { useState } from 'react'

// Components imports
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from "@/components/ui/separator"
import LoadingAnimation from '@/components/shared/LoadingAnimation'

// Actions
import { createOrganization } from '../actions/createOrganization'

// Tanstack query client
import { useQueryClient } from '@tanstack/react-query'

// Hooks
import { useCurrentUser } from '@/features/organizations/members/queries/useCurrentUser'

interface CreateOrganizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CreateOrganizationDialog({ open, onOpenChange }: CreateOrganizationDialogProps) {
    // loading and error states
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Initailzie a query client
    const queryClient = useQueryClient()

    // Get current user to check if admin
    const { user } = useCurrentUser()

    // Check if user is admin from Supabase user metadata
    const isAdmin = user?.user_metadata?.role === 'admin'

    // Form submission handler
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {

        e.preventDefault() // Intercept form event
        setIsLoading(true) // set loading state
        setError(null) // Set error state

        const formData = new FormData(e.currentTarget) // extract form data

        try {
            await createOrganization(formData) // create organization action
            queryClient.invalidateQueries({ queryKey: ['organizations'] }) // invalidate organizations query to revalidate
            onOpenChange(false) // Close the dialog state
            } catch (err) { // catch error and un finished checkout error from aciton
            if (err instanceof Error) {
                if (err.message === 'redirect_to_checkout') {
                    setError('Paid plans coming soon! Please select the free plan.')
                } else {
                    setError(err.message)
                }
            }
            } finally {
                setIsLoading(false) // set loading state to false
            }
        }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm p-5 sm:max-w-[700px]">
        <DialogHeader>
            <DialogTitle>Create a New Organization</DialogTitle>
            <DialogDescription className='text-sm max-w-md'>
                Organizations are a way to group your projects.
                Each organization can be configured with different team members and billing settings.
            </DialogDescription>
        </DialogHeader>

        <Separator />

        {isLoading ? (
          <div className="flex justify-center items-center min-h-[500px]">
            <LoadingAnimation size={64} color="#3b82f6" />
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-6 mt-1">
            {/* Organization Name */}
            <div className="space-y-2 flex flex-row items-start justify-between">
                <Label htmlFor="name">Name *</Label>
                <div className="space-y-2 max-w-sm items-start">
                    <Input
                        id="name"
                        name="name"
                        placeholder="My Organization"
                        required
                        disabled={isLoading}
                    />
                    <p className="text-sm text-muted-foreground">
                        What's the name of your company or team? You can change this later.
                    </p>
                </div>
            </div>

            <Separator />

            {/* Type Selection */}
            <div className="space-y-2 flex flex-row items-start justify-between">
                <Label htmlFor="type">Type</Label>
                <div className='space-y-2 max-w-sm items-start'>
                    <Select name="type" defaultValue="personal" disabled={isLoading}>
                        <SelectTrigger className="w-full min-w-sm">
                            <SelectValue placeholder="Select organization type" />
                        </SelectTrigger>
                        <SelectContent className="w-full min-w-sm">
                            <SelectItem value="personal">Personal</SelectItem>
                            <SelectItem value="education">Education</SelectItem>
                            <SelectItem value="startup">Startup</SelectItem>
                            <SelectItem value="fund">Fund</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                            <SelectItem value="research">Research</SelectItem>
                            <SelectItem value="n/a">N/A</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                        What's the name of your company or team? You can change this later.
                    </p>
                </div>
            </div>

            <Separator />

            {/* Plan Selection */}
            <div className="space-y-2 flex flex-row items-start justify-between">
                <Label htmlFor="plan">Plan</Label>
                <div className='space-y-2 max-w-sm items-start'>
                    <Select name="plan" defaultValue="free" disabled={isLoading}>
                        <SelectTrigger className="w-full min-w-sm">
                            <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                        <SelectContent className="w-full min-w-sm">
                            <SelectItem value="free">Free - $0/mo</SelectItem>
                            <SelectItem value="standard">Standard - $19/mo</SelectItem>
                            <SelectItem value="pro">Pro - $99/mo</SelectItem>
                            <SelectItem value="team">Team - $699/mo</SelectItem>
                            <SelectItem value="enterprise">Enterprise - Custom</SelectItem>
                            {/* Only show admin plan to admin users */}
                            {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                        </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                        Which plan fits your organization's needs best? <a href="#" className="underline">Learn more</a>.
                    </p>
                </div>
            </div>

            {/* Error Message */}
            {error && (
            <div className="text-sm text-destructive">
                {error}
            </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex justify-between">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isLoading}
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Organization'}
                </Button>
            </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
