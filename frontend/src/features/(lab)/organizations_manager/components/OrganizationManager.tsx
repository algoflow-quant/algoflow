'use client'

// React imports
import React, { useState } from 'react'

// Shadcn Imports
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

// Icon imports
import { Search, Plus } from 'lucide-react'

// Component imports
import OrganizationCard from './OrganizationCard'
import LoadingAnimation from '@/components/shared/LoadingAnimation'
import CreateOrganizationDialog from './CreateOrganizationDialog'

// Hook imports
import { useOrganizations } from '../queries/useOrganizations'

export default function OrganizationManager() {
    const { data: orgs, isLoading, error } = useOrganizations()
    const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <div className='container flex flex-col mx-auto px-4 py-10 max-w-7xl'>
        <h1 className="text-2xl">
            Your Organizations
        </h1>
        <div className='flex flex-row mt-13 justify-between'>
            <Input 
            icon={<Search className="h-4 w-4" />}
            placeholder="Search for an organization"
            className="mb-6 w-70 border-muted border-2 h-8"
            />

            <Button variant='default' size='sm' className='cursor-pointer h-8' onClick={() => setIsDialogOpen(true)}>
                <Plus color='white' className='h-4 w-4'/>
                New Organization
            </Button>

        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {[1, 2].map(i => (
              <Card key={i} className="p-4 flex flex-col gap-3 rounded-sm bg-card h-42">
                {/* Skeleton content */}
                <div className="flex flex-row justify-between">
                  <div className="h-4 bg-muted rounded w-3/4 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 via-white/50 to-transparent" />
                  </div>
                  <div className="h-4 w-4 bg-muted rounded relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 via-white/50 to-transparent" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="h-5 bg-muted rounded w-16 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 via-white/50 to-transparent" />
                  </div>
                  <div className="h-5 bg-muted rounded w-20 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 via-white/50 to-transparent" />
                  </div>
                </div>

                <div className="mt-auto ml-auto h-3 bg-muted rounded w-32 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 via-white/50 to-transparent" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-destructive">
            Error loading organizations: {error.message}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && orgs?.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <p className="text-xl text-muted-foreground mb-2">No organizations yet</p>
            <p className="text-sm text-muted-foreground mb-6">
            Create your first organization to get started with AlgoFlow
            </p>
        </div>
        )}

        {/* Organizations grid */}
        {!isLoading && !error && orgs && orgs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {orgs.map(org => (
              <OrganizationCard key={org.id} organization={org} />
            ))}
          </div>
        )}

        {/* Create Organization Dialog */}
        <CreateOrganizationDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
    </div>
  )
}
