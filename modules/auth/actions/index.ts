"use-server"

import { auth } from "@/auth"
import { db } from "@/lib/db"

// Gets a user by ID along with their linked accounts so auth flows can reuse this data.
export const getUserById = async (id: string) => {
    try {
        const user=await db.user.findUnique({
            where: {
                id
            },
            include: {
                accounts: true
            }
        })
        return user
    
    } catch (error) {
        console.log(error)
        return null
    }
}

// Finds the first account record for a given user so we can check provider-specific details.
export const getAccountByUserId = async (userId: string) => {
    try {
        const acc= await db.account.findFirst({
            where: {
                userId
            }
        })
        return acc
    } catch (error) {
        console.log(error)
        return null
    }
}

// Returns the currently authenticated user from the session, or null when nobody is logged in.
export const currentUser = async () => {
    const user = await auth()
    return user?.user || null
}
