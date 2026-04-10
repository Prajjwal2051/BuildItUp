import { getUserByEmail, getUserById } from './modules/auth/actions/index'
import { db } from '@/lib/db'
import NextAuth from 'next-auth'
import authConfig from './auth.config'

const USER_ROLES = ['USER', 'ADMIN', 'PREMIUM_USER'] as const
type UserRole = (typeof USER_ROLES)[number]
const authSecret =
  process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? process.env.BETTER_AUTH_SECRET

if (process.env.NODE_ENV === 'production' && !authSecret) {
  throw new Error(
    'Missing Auth secret: set AUTH_SECRET (or NEXTAUTH_SECRET/BETTER_AUTH_SECRET) in environment variables.',
  )
}

// Validates unknown token role values before writing them into typed session.user.role.
function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLES.includes(value as UserRole)
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Use JWT sessions because the Prisma schema currently has no Session model.
  session: {
    strategy: 'jwt',
  },
  callbacks: {

    /**
     * signIn callback — runs every time a user tries to sign in.
     *
     * Flow:
     *  1. Validate that user and account data exist.
     *  2. Check if the user already exists in our DB (by email).
     *  3a. If NEW user → create User + linked Account in one go.
     *  3b. If EXISTING user → check if their OAuth account is already linked.
     *      If not linked yet → create the Account and link it to the existing User.
     *
     * Returns true  → sign-in proceeds.
     * Returns false → sign-in is blocked.
     */
    async signIn({ user, account }) {
      // Credentials procider (dev only) doesn't return an account object, so we skip all DB checks and allow sign-in.
      if(!account) {
        return process.env.NODE_ENV === 'development'
      }

      // Guard: if NextAuth didn't provide user/account data, block sign-in
      if (!user || !account) {
        return false
      }

      // HOW: Provider+providerAccountId is the most stable identity across re-logins,
      // so we check this first to avoid creating duplicate users when profile payloads vary.
      try {
        const existingAccount = await db.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          include: {
            user: true,
          },
        })

        if (existingAccount) {
          // Keep OAuth tokens fresh while preserving the same DB user link.
          await db.account.update({
            where: {
              id: existingAccount.id,
            },
            data: {
              type: account.type,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              scope: account.scope,
              token_type: account.token_type,
              id_token: account.id_token,
              session_state: account.session_state as string | null,
            },
          })

          return true
        }

        if (!user.email) {
          return false
        }

        // Step 1: Check if a user with this email already exists in our database
        const isExistingUser = await db.user.findUnique({
          where: {
            email: user.email,
          },
        })

        if (!isExistingUser) {
          // ── NEW USER ──────────────────────────────────────────────────
          // User doesn't exist yet, so create them along with their
          // OAuth account (e.g. Google/GitHub) in a single nested write.

          const newUser = await db.user.create({
            data: {
              name: user.name ?? user.email.split('@')[0],
              email: user.email,
              image: user.image,

              accounts: {
                create: {
                  provider: account.provider, // e.g. "google"
                  providerAccountId: account.providerAccountId, // Google's user ID
                  type: account.type, // "oauth"
                  access_token: account.access_token,
                  refresh_token: account.refresh_token,
                  expires_at: account.expires_at, // token expiry (unix)
                  scope: account.scope,
                  token_type: account.token_type, // "Bearer"
                  id_token: account.id_token, // JWT from provider
                  session_state: account.session_state as string | null,
                },
              },
            },
          })

          // If DB write failed for some reason, block sign-in
          if (!newUser) {
            return false
          }

          // New user + account created successfully → allow sign-in
          return true
        }

        // ── EXISTING USER ─────────────────────────────────────────────────
        // User with this email already exists. Link this provider account once.
        await db.account.create({
          data: {
            userId: isExistingUser.id,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            type: account.type,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            scope: account.scope,
            token_type: account.token_type,
            id_token: account.id_token,
            session_state: account.session_state as string | null,
          },
        })

        // Existing user (with or without newly linked account) → allow sign-in
        return true
      } catch (error) {
        // surfaces the exact DB/Prisma error to the client for easier debugging, but you might want to log this instead and return a generic error message in production.
        console.error('[auth][signIn] DB Error:', error)
        return false
      }
    },

    /**
     * JWT callback — runs whenever a JSON Web Token is created or updated.
     * Here we enhance the token with custom user details (like role) from our DB
     * so the client can access them later in the session.
     */
    async jwt({ token }) {
      // Resolve the DB user using id first, then fallback to email.
      try {
        const dbUserById = token.sub ? await getUserById(token.sub) : null
        const dbUser = dbUserById ?? (token.email ? await getUserByEmail(token.email) : null)
        if (!dbUser) return token

        token.sub = dbUser.id
        token.id = dbUser.id
        token.name = dbUser.name
        token.email = dbUser.email
        token.role = dbUser.role
        return token
      } catch (error) {
        console.error('[auth][jwt] DB Error:', error)
        return token
      }
    },
    /**
     * Session callback — runs when the client checks the session (e.g. useSession()).
     * We copy the data we stored in the JWT (like ID and role) into the session object
     * so the frontend can easily read `session.user.role`.
     */
    async session({ session, token }) {
      if ((token.id || token.sub) && session.user) {
        session.user.id = (token.id as string) || token.sub!
      }
      if (token.sub && session.user) {
        session.user.role = isUserRole(token.role) ? token.role : 'USER'
      }

      return session
    },
    // Ensures successful OAuth flows land on /dashboard when no explicit callback URL is kept.
    async redirect({ url, baseUrl }) {
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/dashboard`
      }

      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      }

      try {
        const parsedUrl = new URL(url)
        if (parsedUrl.origin === baseUrl) {
          return url
        }
      } catch {
        return `${baseUrl}/dashboard`
      }

      return `${baseUrl}/dashboard`
    },
  },
  secret: authSecret,
  ...authConfig,
})
