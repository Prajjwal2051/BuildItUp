import { db } from '@/lib/db';
import NextAuth from "next-auth"
import {prismaAdapter} from "@next-auth/prisma-adapter"
import authConfig from './auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
    callbacks:{
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

            // Guard: if NextAuth didn't provide user/account data, block sign-in
            if (!user || !account) {
                return false;
            }

            // Step 1: Check if a user with this email already exists in our database
            const isExistingUser = await db.user.findUnique({
                where: {
                    email: user.email!
                }
            });

            if (!isExistingUser) {
                // ── NEW USER ──────────────────────────────────────────────────
                // User doesn't exist yet, so create them along with their
                // OAuth account (e.g. Google/GitHub) in a single nested write.

                const newUser = await db.user.create({
                    data: {
                        name: user.name!,
                        email: user.email!,
                        image: user.image!,

                        accounts: {
                            // @ts-ignore — session_state type mismatch in Prisma schema
                            create: {
                                provider: account.provider,               // e.g. "google"
                                providerAccountId: account.providerAccountId, // Google's user ID
                                type: account.type,                       // "oauth"
                                access_token: account.access_token,
                                refresh_token: account.refresh_token,
                                expires_at: account.expires_at,           // token expiry (unix)
                                scope: account.scope,
                                token_type: account.token_type,           // "Bearer"
                                id_token: account.id_token,               // JWT from provider
                                session_state: account.session_state,
                            }
                        }
                    }
                });

                // If DB write failed for some reason, block sign-in
                if (!newUser) {
                    return false;
                }

                // New user + account created successfully → allow sign-in
                return true;
            }

            // ── EXISTING USER ─────────────────────────────────────────────────
            // User with this email already exists. Now check if THIS specific
            // OAuth provider account (e.g. their Google account) is already linked.

            // FIX: existingAccount declared HERE (outside else) so it's accessible below
            const existingAccount = await db.account.findUnique({
                where: {
                    provider_providerAccountId: {
                        provider: account.provider,
                        providerAccountId: account.providerAccountId,
                    }
                }
            });

            if (!existingAccount) {
                // The user exists but this OAuth provider isn't linked yet.
                // Example: user signed up with GitHub, now signing in with Google.
                // → Create a new Account row and link it to the existing User.

                await db.account.create({
                    data: {
                        userId: isExistingUser.id,        // link to the existing user
                        provider: account.provider,
                        providerAccountId: account.providerAccountId,
                        type: account.type,
                        access_token: account.access_token,
                        refresh_token: account.refresh_token,
                        expires_at: account.expires_at,
                        scope: account.scope,
                        token_type: account.token_type,
                        id_token: account.id_token,
                        // @ts-ignore — session_state type mismatch in Prisma schema
                        session_state: account.session_state,
                    }
                });
            }

            // Existing user (with or without newly linked account) → allow sign-in
            return true;
        },

        async jwt() { },
        async session() { },
    },

    secret: process.env.NEXTAUTH_SECRET,
    adapter: PrismaAdapter(db),
    ...authConfig,
});

        async jwt(){},
        async session(){},
    },
    secret:process.env.NEXTAUTH_SECRET,
    adapter:prismaAdapter(db),
    ...authConfig

})