import { NextAuth } from 'next-auth';
import { UserRole } from "@prisma/client";
import { type DefaultSession } from "next-auth"

// Extends the default NextAuth user type so our session.user always has id and role.
export type ExtendUser = DefaultSession["user"] & {
    id: string;
    role: UserRole;
}

// Tells NextAuth that Session.user should use our extended user type across the app.
declare module "next-auth"{
    interface Session {
        user: ExtendUser
    }
}

import { jwt } from "next-auth/jwt"

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: UserRole;
    }
}