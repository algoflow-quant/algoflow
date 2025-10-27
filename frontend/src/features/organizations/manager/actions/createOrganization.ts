"use server"

// Import types
import type { Organization } from '../types'

// Supabase imports
import { createClient } from '@/lib/supabase/server'

// Next js imports
import { headers } from "next/headers"

// Arcjet imports
import arcjet, { slidingWindow, detectBot } from "@arcjet/next"

// Arcjet configuration
const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    detectBot({ mode: "LIVE", allow: [] }),
    slidingWindow({ 
      mode: "LIVE", 
      interval: "1h", 
      max: 100  // Max 5 organizations per hour
    }),
  ],
})

/*
 *  Create Organization server action, sends a reqeust to the server to create organization
 */
async function createOrganization(formData: FormData): Promise<Organization>  {
    // Arcjet protection
    const headersList = await headers()
    const decision = await aj.protect({ headers: headersList })
    
    if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
            throw new Error("Too many organization creation attempts. Please try again later.")
        } else {
            throw new Error("Request blocked. Please try again.")
        }
    }
    
    // Get supabase client and get user data
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Check user exists
    if (!user) {
        throw new Error('Not authenticated')
    }

    // 2. Get user's role from profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const isAdminOrOwner = profile?.role === 'admin' || profile?.role === 'owner'

    // Get selected plan from form
    const selectedPlan = formData.get('plan') as string || 'free'

    // 3. Check free organization limit (skip for admins/owners)
    if (!isAdminOrOwner) {
        // Only check limit if they're trying to create a FREE org
        if (selectedPlan === 'free') {
            const { count } = await supabase
                .from('organizations')
                .select('*', { count: 'exact', head: true })
                .eq('owner_id', user.id)
                .eq('plan', 'free')

            if (count && count >= 1) {
                throw new Error('You already have a free organization. Upgrade your plan or create a paid organization.')
            }
        }
    }

    // 4. Extract and validate form data
    const name = formData.get('name') as string
    if (!name || name.trim().length === 0) {
        throw new Error('Organization name is required')
    }

    // Extract type
    const selectedType = formData.get('type') as string || 'n/a'

    // 5. Validate plan is allowed
    const allowedPlans = ['free', 'standard', 'pro', 'team', 'enterprise', 'admin']
    if (!allowedPlans.includes(selectedPlan)) {
        throw new Error('Invalid plan selected')
    }

    // 6. Validate type is allowed
    const allowedTypes = ['personal', 'education', 'startup', 'fund', 'enterprise', 'research', 'n/a']
    if (!allowedTypes.includes(selectedType)) {
        throw new Error('Invalid type selected')
    }

    // 6. Handle payment if selection is not free (skip for admins/owners)
    if (selectedPlan !== 'free' && !isAdminOrOwner) {
        // Add checkout and other plans later
        throw new Error('redirect_to_checkout')
    }

    // 7. Insert into database
    const { data, error } = await supabase
        .from('organizations')
        .insert({
            name: name.trim(),
            owner_id: user.id,
            plan: selectedPlan,
            type: selectedType
        })
        .select()
        .single()

    // 8. Handle errors
    if (error) {
        throw new Error(error.message)
    }

    // 9. Return the new org
    return data
}

export { createOrganization }