import type { UserContext } from '@/lib/abac/types'
import { prisma } from '../utils/prisma'
import { UnauthorizedError } from '../utils/errors'

// Base repository class with user context and Prisma access
export abstract class Repository {
  protected prisma = prisma // protected is only availbe in the class heirarchy not available outside
  protected userContext: UserContext

  constructor(userContext: UserContext) {
    this.userContext = userContext // user the user context 
  }

  // Helper to throw unauthorized errors with ABAC reason
  protected unauthorized(reason?: string): never {
    throw new UnauthorizedError(reason)
  }
}
