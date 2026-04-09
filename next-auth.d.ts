import { type DefaultSession } from 'next-auth'

type UserRole = 'USER' | 'ADMIN' | 'PREMIUM_USER'

// Extends the default NextAuth user type so our session.user always has id and role.
export type ExtendUser = DefaultSession['user'] & {
  id: string
  role: UserRole
}

// Tells NextAuth that Session.user should use our extended user type across the app.
declare module 'next-auth' {
  interface Session {
    user: ExtendUser
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
  }
}
