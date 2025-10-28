// DAL error classes for consistent error handling

// Custom error classes for better handling and reporting

export class DALError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DALError'
  }
}

export class UnauthorizedError extends DALError {
  constructor(message = 'Unauthorized: Permission denied') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class NotFoundError extends DALError {
  constructor(resource: string) {
    super(`${resource} not found`)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends DALError {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}
