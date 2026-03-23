"use server"

// This file defines server actions for the playground module, which are functions that can be called from the client to perform server-side operations. These actions can include creating, updating, or deleting playgrounds, as well as fetching data related to playgrounds. By centralizing these actions in one file, we can keep our code organized and maintain a clear separation between client and server logic.

import { db } from "../../../lib/db"


async function getPlaygroundById(id: string) {
    // This function retrieves a playground by its ID from the database. It uses the Prisma client to query the Playground model and returns the corresponding playground data. This action can be called from the client to fetch the details of a specific playground when needed.
    try {
        const playground = await db.playground.findUnique({
            where: {
                id
            },
            select: {
                templateFile: {
                    select: {
                        content: true
                    }
                }
            }
        })
        return playground
    } catch (error) {
        console.error("Error fetching playground:", error)
        throw new Error("Failed to fetch playground")
    }
}

export { getPlaygroundById }



