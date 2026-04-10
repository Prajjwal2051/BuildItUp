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
      // GitHub is not an OIDC provider and does not return an `iss` claim.
      // oauth4webapi v3+ enforces issuer validation by default, so we
      // explicitly set the issuer to GitHub's API URL to skip the check.
      issuer: 'https://github.com',
      authorization: {
        params: {
          scope: 'read:user user:email',
        },
      },
    }),
    Google({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
  ],
} satisfies NextAuthConfig
