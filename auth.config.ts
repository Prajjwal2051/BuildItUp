import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import type { NextAuthConfig } from 'next-auth'

export default {
  // Middleware also consumes this config, so trustHost must be set here.
  trustHost: true,
  pages: {
    signIn: '/auth/sign-in',
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      checks: ['state'],
      // Disable issuer check — GitHub OAuth is not an OIDC provider
      // and does not return a standard "iss" claim.
      issuer:undefined,
    }),
    Google({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
  ],
} satisfies NextAuthConfig
