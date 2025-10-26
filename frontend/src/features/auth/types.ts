export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupData {
  email: string
  password: string
  name: string
  username: string
}

export interface AuthError {
  message: string
  code?: string
}
