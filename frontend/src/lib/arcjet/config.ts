import arcjet, { slidingWindow, detectBot, protectSignup } from '@arcjet/next'

/**
 * Centralized Arcjet configuration for all server actions
 *
 * Each action has:
 * - Bot detection (LIVE mode, no bots allowed)
 * - Rate limiting (sliding window)
 * - Optional custom rules
 */

// Base Arcjet key
const ARCJET_KEY = process.env.ARCJET_KEY!

/**
 * Arcjet configurations by action name
 */
export const arcjetConfigs = {
  // ============ AUTH ACTIONS ============
  login: arcjet({
    key: ARCJET_KEY,
    rules: [
      detectBot({ mode: 'LIVE', allow: [] }),
      slidingWindow({
        mode: 'LIVE',
        interval: '15m',
        max: 5  // 5 login attempts per 15 minutes
      })
    ]
  }),

  signup: arcjet({
    key: ARCJET_KEY,
    rules: [
      protectSignup({
        email: {
          mode: "LIVE",
          block: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"],
        },
        bots: {
          mode: "LIVE",
          allow: [],
        },
        rateLimit: {
          mode: "LIVE",
          interval: "10m",
          max: 3,  // 3 signups per 10 minutes
        },
      }),
    ],
  }),

  // ============ PROFILE ACTIONS ============
  updateProfile: arcjet({
    key: ARCJET_KEY,
    rules: [
      detectBot({ mode: 'LIVE', allow: [] }),
      slidingWindow({
        mode: 'LIVE',
        interval: '1m',
        max: 10  // 10 profile updates per minute
      })
    ]
  }),

  updatePassword: arcjet({
    key: ARCJET_KEY,
    rules: [
      detectBot({ mode: 'LIVE', allow: [] }),
      slidingWindow({
        mode: 'LIVE',
        interval: '15m',
        max: 3  // 3 password changes per 15 minutes
      })
    ]
  }),

  uploadAvatar: arcjet({
    key: ARCJET_KEY,
    rules: [
      detectBot({ mode: 'LIVE', allow: [] }),
      slidingWindow({
        mode: 'LIVE',
        interval: '5m',
        max: 5  // 5 avatar uploads per 5 minutes
      })
    ]
  }),

  removeAvatar: arcjet({
    key: ARCJET_KEY,
    rules: [
      detectBot({ mode: 'LIVE', allow: [] }),
      slidingWindow({
        mode: 'LIVE',
        interval: '1m',
        max: 10  // 10 avatar removals per minute
      })
    ]
  }),

  deleteAccount: arcjet({
    key: ARCJET_KEY,
    rules: [
      detectBot({ mode: 'LIVE', allow: [] }),
      slidingWindow({
        mode: 'LIVE',
        interval: '1h',
        max: 2  // 2 account deletions per hour
      })
    ]
  }),

  // ============ ORGANIZATION ACTIONS ============
  createOrganization: arcjet({
    key: ARCJET_KEY,
    rules: [
      detectBot({ mode: 'LIVE', allow: [] }),
      slidingWindow({
        mode: 'LIVE',
        interval: '1h',
        max: 5  // 5 orgs created per hour
      })
    ]
  }),

  // ============ MEMBER ACTIONS ============
  sendInvitation: arcjet({
    key: ARCJET_KEY,
    rules: [
      detectBot({ mode: 'LIVE', allow: [] }),
      slidingWindow({
        mode: 'LIVE',
        interval: '5m',
        max: 10  // 10 invitations per 5 minutes
      })
    ]
  }),

  handleInvitation: arcjet({
    key: ARCJET_KEY,
    rules: [
      detectBot({ mode: 'LIVE', allow: [] }),
      slidingWindow({
        mode: 'LIVE',
        interval: '1m',
        max: 10  // 10 invitation actions per minute
      })
    ]
  }),

  manageMember: arcjet({
    key: ARCJET_KEY,
    rules: [
      detectBot({ mode: 'LIVE', allow: [] }),
      slidingWindow({
        mode: 'LIVE',
        interval: '1m',
        max: 20  // 20 member management actions per minute
      })
    ]
  }),

  // ============ NOTIFICATION ACTIONS ============
  markAsRead: arcjet({
    key: ARCJET_KEY,
    rules: [
      detectBot({ mode: 'LIVE', allow: [] }),
      slidingWindow({
        mode: 'LIVE',
        interval: '1m',
        max: 100  // 100 notification actions per minute
      })
    ]
  }),

  deleteNotification: arcjet({
    key: ARCJET_KEY,
    rules: [
      detectBot({ mode: 'LIVE', allow: [] }),
      slidingWindow({
        mode: 'LIVE',
        interval: '1m',
        max: 100  // 100 notification deletions per minute
      })
    ]
  }),
} as const

/**
 * Type-safe Arcjet config getter
 */
export type ArcjetAction = keyof typeof arcjetConfigs

export function getArcjetConfig(action: ArcjetAction) {
  return arcjetConfigs[action]
}
