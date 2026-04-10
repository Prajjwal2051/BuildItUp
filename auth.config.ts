import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

export default {
  pages: {
    signIn: '/auth/sign-in',
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    Google({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
    // -------------- DEV ONLY : bypass Oauth for local testing --------------
    ...(process.env.NODE_ENV === 'development'
      ? [
        Credentials({
          name: 'Dev Login',
          credentials: {
            email: { label: 'Email', type: 'text' },
          },
          async authorize(credentials) {
            // Any email is accepted in dev — returns a mock user object
            if (typeof credentials?.email !== 'string') return null
            return {
              id: 'dev-user-id',
              name: 'Dev User',
              email: 'dev@local.dev',
            }
          },
        }),
      ]
      : []),
  ],
} satisfies NextAuthConfig
