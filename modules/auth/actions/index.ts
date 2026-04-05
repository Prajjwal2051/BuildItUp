'use server'

import { auth } from '@/auth'
import { db } from '@/lib/db'

// Gets a user by ID along with their linked accounts so auth flows can reuse this data.
async function getUserById(id: string) {
  try {
    const user = await db.user.findUnique({
      where: {
        id,
      },
      include: {
        accounts: true,
      },
    })
    return user
  } catch (error) {
    console.log(error)
    return null
  }
}

// Finds a user by email so auth callbacks can map provider identities to one DB user.
async function getUserByEmail(email: string) {
  try {
    const user = await db.user.findUnique({
      where: {
        email,
      },
      include: {
        accounts: true,
      },
    })
    return user
  } catch (error) {
    console.log(error)
    return null
  }
}

// Finds the first account record for a given user so we can check provider-specific details.
async function getAccountByUserId(userId: string) {
  try {
    const acc = await db.account.findFirst({
      where: {
        userId,
      },
    })
    return acc
  } catch (error) {
    console.log(error)
    return null
  }
}

// Returns the currently authenticated user from the session, or null when nobody is logged in.
async function currentUser() {
  const user = await auth()
  return user?.user || null
}

export { getUserById, getUserByEmail, getAccountByUserId, currentUser }
