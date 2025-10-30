import { headers } from 'next/headers'
import { type ArcjetAction, getArcjetConfig } from './config'

/**
 * Protect a server action with Arcjet - overload for signup with email
 */
export async function protectAction(
  action: 'signup',
  additionalContext: { email: string }
): Promise<void>

/**
 * Protect a server action with Arcjet - overload for other actions
 */
export async function protectAction(
  action: Exclude<ArcjetAction, 'signup'>, // other actions than signup
  additionalContext?: Record<string, unknown> // optional
): Promise<void> // unified implementation

/**
 * Protect a server action with Arcjet
 *
 * @param action - The action name (must match arcjetConfigs key)
 * @param additionalContext - Optional additional context for Arcjet (e.g., email for signup)
 * @throws Error if request is denied
 *
 * @example
 * export async function login(formData: FormData) {
 *   await protectAction('login')
 *   // ... rest of login logic
 * }
 *
 * @example
 * export async function signup(formData: FormData) {
 *   const email = formData.get('email') as string
 *   await protectAction('signup', { email })
 *   // ... rest of signup logic
 * }
 */
export async function protectAction(
  action: ArcjetAction, // 'signup' | 'login' | etc.
  additionalContext?: Record<string, unknown> // optional
): Promise<void> { // unified implementation
  const headersList = await headers() // get request headers
  const aj = getArcjetConfig(action) // get Arcjet config for action

  // Arcjet protect() has different signatures for different rules
  // For protectSignup, it requires { email: string }
  // For other rules, additionalContext is optional
  // We pass an empty object when no context to satisfy the type system
  const context = additionalContext || {} // default to empty object if none provided
  const decision = await aj.protect({ headers: headersList }, context as never) // never type for additionalContext

  if (decision.isDenied()) {
    // Handle rate limiting
    if (decision.reason.isRateLimit()) {
      throw new Error('Too many requests. Please try again later.')
    }

    // Handle email validation (signup)
    if (decision.reason.isEmail()) {
      throw new Error('Invalid email address. Please use a valid email.')
    }

    // Handle bot detection
    if (decision.reason.isBot()) {
      throw new Error('Request blocked.')
    }

    // Generic denial
    throw new Error('Request denied.')
  }
}
