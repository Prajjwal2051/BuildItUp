'use server'

// This file defines server actions for the playground module, which are functions that can be called from the client to perform server-side operations. These actions can include creating, updating, or deleting playgrounds, as well as fetching data related to playgrounds. By centralizing these actions in one file, we can keep our code organized and maintain a clear separation between client and server logic.

import { db } from '../../../lib/db'
import { currentUser } from '@/modules/auth/actions'

type JsonValue =
    | string
    | number
    | boolean
    | null
    | { [key: string]: JsonValue }
    | JsonValue[]

// Loads one playground only if it belongs to the authenticated user.
async function findOwnedPlayground(playgroundId: string, userId: string) {
    const playground = await db.playground.findUnique({
        where: {
            id: playgroundId,
        },
        select: {
            id: true,
            userId: true,
            title: true,
            templateFile: {
                select: {
                    content: true,
                },
            },
        },
    })

    if (!playground || playground.userId !== userId) {
        throw new Error('Playground not found')
    }

    return playground
}

async function getPlaygroundById(id: string) {
    // This function retrieves a playground by its ID from the database. It uses the Prisma client to query the Playground model and returns the corresponding playground data. This action can be called from the client to fetch the details of a specific playground when needed.
    const user = await currentUser()
    if (!user) {
        throw new Error('Unauthorized')
    }

    try {
        const playground = await findOwnedPlayground(id, user.id)
        return playground
    } catch (error) {
        console.error('Error fetching playground:', error)
        throw new Error('Failed to fetch playground')
    }
}

// This function saves the updated template data for a specific playground. It takes the playground ID and the new template data as parameters, and it updates the corresponding template file in the database. If the playground does not exist, it can create a new entry. This action allows the client to persist changes made to the playground's template data.
const SaveUpdatedCode = async (playgroundId: string, data: JsonValue) => {
    const user = await currentUser()
    if (!user) {
        throw new Error('Unauthorized')
    }

    try {
        // Verify ownership before mutating template data to block cross-user writes.
        await findOwnedPlayground(playgroundId, user.id)

        const upadtedPlayground = await db.templateFile.upsert({
            where: {
                playgroundId: playgroundId,
            },
            update: {
                content: JSON.stringify(data),
            },
            create: {
                content: JSON.stringify(data),
                playground: {
                    connect: {
                        id: playgroundId,
                    },
                },
            },
        })
        return upadtedPlayground
    } catch (error) {
        console.error('Error saving template data:', error)
        throw new Error('Failed to save template data')
    }
}

export { getPlaygroundById, SaveUpdatedCode }
