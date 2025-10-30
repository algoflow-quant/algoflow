import type {
    AuthorizationRequest,
    AuthorizationResult,
} from './types'
import { allPolicies } from './policies'

/**
 * Authorization Service
 * Evaluates requests against policies to allow/deny actions
 *
 * PERFORMANCE: Uses Map-based cache for O(1) policy lookup instead of O(n) array search
 */

// Build policy cache on module load for instant O(1) lookups
// Map key format: "resource:action" (e.g., "organization:read")
const policyCache = new Map<string, typeof allPolicies[0]>()

allPolicies.forEach(policy => {
    const key = `${policy.resource}:${policy.action}`
    policyCache.set(key, policy)
})

// Check if action is allowed. Universal permission checking function
// Now uses O(1) Map lookup instead of O(n) array search
export function authorize(request: AuthorizationRequest): AuthorizationResult {
    // Fast O(1) lookup instead of O(n) find()
    const key = `${request.resource.type}:${request.action}`
    const policy = policyCache.get(key)

    // If no policy exists for this resource + action combination
    if (!policy) {
        return {
        granted: false,
        reason: `No policy found for ${request.action} on ${request.resource.type}`,
        }
    }

    // Execute the policy rule to determine if access is granted
    const granted = policy.rule(request)

    // Return authorization result with reason if denied
    return {
        granted,
        reason: granted ? undefined : policy.description,
    }
}

// Throws error if denied - use this in DAL methods. Wrapper for authorize method 
export function requireAuthorization(request: AuthorizationRequest): void {
    const result = authorize(request) // call authorize function with perm request

    if (!result.granted) { // throwing error stops the server action from running
        throw new Error(`Unauthorized: ${result.reason || 'Permission denied'}`)
    }
}

// Check multiple permissions, for simplicty
export function authorizeMany(requests: AuthorizationRequest[]): AuthorizationResult[] {
    return requests.map((req) => authorize(req))
}

// User needs at least ONE of these permissions
export function authorizeAny(requests: AuthorizationRequest[]): AuthorizationResult {
    const results = authorizeMany(requests)
    const granted = results.some((r) => r.granted)

    return {
        granted,
        reason: granted ? undefined : 'None of the required permissions granted',
    }
}

// User needs ALL these permissions
export function authorizeAll(requests: AuthorizationRequest[]): AuthorizationResult {
    const results = authorizeMany(requests)
    const granted = results.every((r) => r.granted)

    return {
        granted,
        reason: granted ? undefined : 'Not all required permissions granted',
    }
}