/**
 * NextAuth Configuration with OAuth Providers
 *
 * This file configures NextAuth for OAuth-based authentication using GitHub and Google providers.
 * It handles user creation, account linking, and session management with a MongoDB database via Prisma.
 *
 * Authentication Flow:
 * 1. User signs in with an OAuth provider (GitHub or Google)
 * 2. The signIn callback checks if the user exists in the database
 * 3. If new user: Creates both User and Account records atomically
 * 4. If existing user: Links the OAuth account to the existing user (if not already linked)
 * 5. Stores OAuth tokens securely in the database for future API calls
 *
 * Security Considerations:
 * - OAuth tokens (access_token, refresh_token, id_token) are stored in the database
 * - NEXTAUTH_SECRET environment variable is used to encrypt session tokens
 * - Prisma adapter handles secure session management
 */

import { db } from '@/lib/db';
import NextAuth from "next-auth"
import {prismaAdapter} from "@next-auth/prisma-adapter"
import authConfig from './auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
    callbacks:{
        /**
         * signIn Callback
         *
         * This callback is invoked whenever a user attempts to sign in.
         * It handles two main scenarios:
         *
         * Scenario 1 - New User Registration:
         * - Creates a new User record with profile information (name, email, image)
         * - Simultaneously creates an Account record with OAuth provider details
         * - Stores OAuth tokens for making authenticated API calls to the provider
         *
         * Scenario 2 - Existing User Sign-In with New Provider:
         * - User already exists in database but is signing in with a different OAuth provider
         * - Links the new OAuth provider account to the existing user
         * - Allows users to sign in with multiple OAuth providers (GitHub OR Google)
         *
         * @param user - User object from OAuth provider (contains name, email, image)
         * @param account - Account object with OAuth credentials and tokens
         * @returns true if sign-in should proceed, false to deny access
         */
        async signIn({
            user,
            account,
        }){
            // Validate that we have both user and account data from the OAuth provider
            if(!user || !account){
                return false
            }

            // Check if a user with this email already exists in our database
            const isExistingUser = await db.user.findUnique({
                where:{
                    email:user.email!
                }
            })

            // SCENARIO 1: New user signing up for the first time
            if(!isExistingUser){
                // Create user and link OAuth account in a single atomic operation
                // This uses Prisma's nested create to ensure both records are created together
                const newUser=await db.user.create({
                    data:{
                        name:user.name!,
                        email:user.email!,
                        image:user.image!,

                        accounts:{
                            // @ts-ignore - Prisma adapter types don't perfectly match NextAuth Account type
                            // The session_state field exists in NextAuth but may not be in Prisma's type definition
                            create:{
                                provider:account.provider,                    // 'github' or 'google'
                                providerAccountId:account.providerAccountId,  // Unique ID from OAuth provider
                                type:account.type,                            // 'oauth' | 'oidc' | 'email' | 'credentials'
                                access_token:account.access_token,            // Token for accessing provider APIs
                                refresh_token:account.refresh_token,          // Token for refreshing access_token
                                expires_at:account.expires_at,                // Unix timestamp when access_token expires
                                scope:account.scope,                          // OAuth scopes granted
                                token_type:account.token_type,                // Usually 'Bearer'
                                id_token:account.id_token,                    // JWT identity token (OIDC)
                                session_state:account.session_state,          // OAuth session state
                            }
                        }
                    }
                })

                // If user creation failed, deny sign-in
                if(!newUser){
                    return false
                }

                // New user created successfully, allow sign-in
                return true
            }

            // SCENARIO 2: Existing user signing in (possibly with a new OAuth provider)
            // Check if this specific OAuth account is already linked to the user
            const existingAccount = await db.account.findUnique({
                where:{
                    // Composite unique key: provider + providerAccountId
                    // e.g., 'github' + '12345' or 'google' + '67890'
                    provider_providerAccountId:{
                        provider:account.provider,
                        providerAccountId:account.providerAccountId,
                    }
                }
            })

            // If this OAuth account isn't linked yet, create the account link
            // This allows users to sign in with multiple providers (e.g., both GitHub and Google)
            if(!existingAccount){
                await db.account.create({
                    data:{
                        userId:isExistingUser.id,                    // Link to existing user
                        provider:account.provider,
                        providerAccountId:account.providerAccountId,
                        type:account.type,
                        access_token:account.access_token,
                        refresh_token:account.refresh_token,
                        expires_at:account.expires_at,
                        scope:account.scope,
                        token_type:account.token_type,
                        id_token:account.id_token,
                        // @ts-ignore - Same type mismatch as above with session_state field
                        session_state:account.session_state,
                    }
                })
            }

            // Existing user with account linked (or just linked above), allow sign-in
            return true
        },

        /**
         * jwt Callback
         *
         * Currently empty - using default NextAuth JWT behavior.
         *
         * This callback would be used to:
         * - Add custom claims to the JWT (e.g., user role, permissions)
         * - Refresh OAuth tokens when they expire
         * - Add additional user data to the token
         *
         * Example usage:
         * async jwt({ token, user }) {
         *   if (user) {
         *     token.role = user.role
         *   }
         *   return token
         * }
         */
        async jwt(){},

        /**
         * session Callback
         *
         * Currently empty - using default NextAuth session behavior.
         *
         * This callback would be used to:
         * - Add JWT data to the session object available on the client
         * - Include user role or permissions in the session
         * - Customize what data is exposed to the client
         *
         * Example usage:
         * async session({ session, token }) {
         *   session.user.role = token.role
         *   return session
         * }
         */
        async session(){},
    },

    // Secret key used to encrypt JWT tokens and session cookies
    // MUST be set in production for security
    secret:process.env.NEXTAUTH_SECRET,

    // Prisma adapter connects NextAuth to our MongoDB database
    // Handles all database operations for users, accounts, sessions, etc.
    adapter:prismaAdapter(db),

    // Spread in OAuth provider configuration (GitHub, Google) from auth.config.ts
    // Keeps provider credentials separate from business logic
    ...authConfig

})