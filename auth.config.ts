/**
 * NextAuth Provider Configuration
 *
 * This file defines the OAuth providers available for authentication.
 * Provider credentials are loaded from environment variables for security.
 *
 * Supported Providers:
 * - GitHub: Allows users to sign in with their GitHub account
 * - Google: Allows users to sign in with their Google account
 *
 * Environment Variables Required:
 * - GITHUB_ID: OAuth App Client ID from GitHub Developer Settings
 * - GITHUB_SECRET: OAuth App Client Secret from GitHub Developer Settings
 * - GOOGLE_ID: OAuth 2.0 Client ID from Google Cloud Console
 * - GOOGLE_SECRET: OAuth 2.0 Client Secret from Google Cloud Console
 *
 * Setup Instructions:
 * 1. GitHub: https://github.com/settings/developers (Create OAuth App)
 * 2. Google: https://console.cloud.google.com/apis/credentials (Create OAuth 2.0 Client)
 * 3. Add callback URL: [YOUR_DOMAIN]/api/auth/callback/[provider]
 */

import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import type { NextAuthConfig } from "next-auth"

export default{
    providers: [
        // GitHub OAuth Provider
        // Users can sign in with their GitHub account
        GitHub({
            clientId: process.env.GITHUB_ID!,        // OAuth App Client ID
            clientSecret: process.env.GITHUB_SECRET!, // OAuth App Client Secret
        }),

        // Google OAuth Provider
        // Users can sign in with their Google account
        Google({
            clientId: process.env.GOOGLE_ID!,        // OAuth 2.0 Client ID
            clientSecret: process.env.GOOGLE_SECRET!, // OAuth 2.0 Client Secret
        }),
    ],
} satisfies NextAuthConfig