import type {
    AuthorizationRequest,
    AuthorizationResult,
} from './types'
import { allPolicies } from './policies'

/**
 * Authorization Service
 * Evaluates requests against policies to allow/deny actions
 */

// Check if action is allowed. Universal permision checking function
export function authorize(request: AuthorizationRequest): AuthorizationResult {
    const policy = allPolicies.find( // All policies was exported from policies
        (p) => p.resource === request.resource.type && p.action === request.action
    )

    // If no policy in the request
    if (!policy) {
        return {
        granted: false,
        reason: `No policy found for ${request.action} on ${request.resource.type}`,
        }
    }

    // return whether or not the policy was granted
    const granted = policy.rule(request)

    // return the status or key val with undefined and the description of what rule we violated
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