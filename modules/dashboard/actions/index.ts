"use server"

// This file is for server actions related to the dashboard, such as fetching user-specific data or handling form submissions. For client-side interactions, use components and hooks within the dashboard module.

// when our user comes to the dashboard page, we want to fetch their playground and display them. This action will be called from the dashboard page component to get the data needed for rendering.
import { db } from "@/lib/db"
import { currentUser } from './../../auth/actions/index';
import { revalidatePath } from "next/cache"
import { getTemplateAbsolutePath } from "@/lib/template"
import { pathToJsonString } from "@/modules/playground/lib/path-to-json"

// This function fetches all playgrounds associated with a given user ID. It first retrieves the user to ensure they exist and then includes their related playgrounds in the query.

export const getAllPlaygroundForUser = async () => {
    // We start by calling the currentUser function to check if there is an authenticated user. If there is no user, we return null, indicating that the action cannot proceed without authentication.
    const user = await currentUser()
    if (!user) {
        return null
    }
    // We only fetch fields needed by the dashboard list to avoid relation hydration failures
    // when legacy playground rows point to missing user documents in MongoDB.
    try {
        const playground = await db.playground.findMany({
            where: {
                userId: user?.id,
            },
            include: {
                starMark: {
                    where: {
                        userId: user.id
                    },
                    select: {
                        isMarked: true
                    }
                }
            },
        });

        return playground;
    } catch (error) {
        console.log(`Error fetching playgrounds for user ${user.id}:`, error);
    }
}

export const createPlayground = async (data: {
    title: string,
    template: "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "ANGULAR" | "HONO",
    description?: string
}) => {
    // First, we check if the user is authenticated by calling the currentUser function. If there is no authenticated user, we throw an error indicating that the action is unauthorized. This ensures that only logged-in users can create a playground.
    const user = await currentUser()
    if (!user) {
        throw new Error("Unauthorized")
        return null
    }
    // now destructing the data and validating it before creating the playground. We want to ensure that the title and template are provided, as they are essential for creating a playground. If either of these is missing, we throw an error to inform the user of the required fields.
    const { title, template, description } = data
    if (!title || !template) {
        throw new Error("Title and template are required")
        return null
    }
    // We snapshot the selected starter template as JSON so the editor can boot with a full file tree.
    const starterTemplateJson = await pathToJsonString(getTemplateAbsolutePath(template), {
        includeFileContent: true,
        ignore: ["node_modules", ".git", ".next", "dist", "build", "package-lock.json", "pnpm-lock.yaml", "yarn.lock"],
    })

    // If the user is authenticated and the required data is valid, we proceed to create a new playground in the database. We use the create method of the db.playground model, passing in the necessary data such as the title, template, description, and the userId of the authenticated user. This action will return the newly created playground object.
    try {
        const playground = await db.playground.create({
            data: {
                title: title,
                template: template,
                description: description ?? "",
                code: starterTemplateJson,
                userId: user.id
            }
        })
        return playground
    } catch (error) {
        console.log(`Error creating playground for user ${user.id}:`, error)
    }
}

export const deletePlaygroundById = async (playgroundId: string) => {
    // First, we check if the user is authenticated by calling the currentUser function. If there is no authenticated user, we throw an error indicating that the action is unauthorized. This ensures that only logged-in users can delete a playground.
    const user = await currentUser()
    if (!user) {
        throw new Error("Unauthorized")
        return null
    }
    // If the user is authenticated, we proceed to delete the playground from the database. We use the delete method of the db.playground model, specifying the playgroundId in the where clause to identify which playground to delete. This action will return the deleted playground object.
    try {
        const deletedPlayground = await db.playground.delete({
            where: {
                id: playgroundId
            }
        })
        revalidatePath("/dashboard") // Revalidate the dashboard page to reflect the changes after deletion
        return deletedPlayground
    } catch (error) {
        console.log(`Error deleting playground with id ${playgroundId}:, error)`)
    }
}

export const editPlaygroundById = async (playgroundId: string, data: {
    title?: string,
    description?: string
}) => {
    // First, we check if the user is authenticated by calling the currentUser function. If there is no authenticated user, we throw an error indicating that the action is unauthorized. This ensures that only logged-in users can edit a playground.
    const user = await currentUser()
    if (!user) {
        throw new Error("Unauthorized")
        return null
    }
    // If the user is authenticated, we proceed to update the playground in the database. We use the update method of the db.playground model, specifying the playgroundId in the where clause to identify which playground to update. We also pass in the data object containing the fields to be updated (title and description). This action will return the updated playground object.
    try {
        const updatedPlayground = await db.playground.update({
            where: {
                id: playgroundId
            },
            data: {
                title: data.title,
                description: data.description
            }
        })
        revalidatePath("/dashboard") // Revalidate the dashboard page to reflect the changes after editing
        return updatedPlayground
    } catch (error) {
        console.log(`Error updating playground with id ${playgroundId}:, error)`)
    }
}

export const duplicatePlaygroundById = async (playground: string) => {
    // First, we check if the user is authenticated by calling the currentUser function. If there is no authenticated user, we throw an error indicating that the action is unauthorized. This ensures that only logged-in users can duplicate a playground.
    const user = await currentUser()
    if (!user) {
        throw new Error("Unauthorized")
        return null
    }
    // first we will fetch the original playground from the database using the provided playground ID. We use the findUnique method of the db.playground model, specifying the playgroundId in the where clause to identify which playground to fetch. This will give us the original playground object that we want to duplicate.
    try {
        const originalPlayground = await db.playground.findUnique({
            where: {
                id: playground
            }
            // here we will implement the template feature later

        })
        if (!originalPlayground) {
            throw new Error("Playground not found")
            return null
        }
        // If the original playground is found, we proceed to create a new playground in the database using the data from the original playground. We use the create method of the db.playground model, passing in the necessary data such as the title (appending "Copy" to indicate it's a duplicate), template, description, code, and the userId of the authenticated user. This action will return the newly created playground object, which is a duplicate of the original.
        const duplicatePlayground = await db.playground.create({
            data: {
                title: originalPlayground.title + " (Copy)",
                template: originalPlayground.template,
                description: originalPlayground.description,
                code: originalPlayground.code,
                userId: user.id
            }
        })
        revalidatePath("/dashboard") // Revalidate the dashboard page to reflect the changes after duplication
        return duplicatePlayground
    } catch (error) {
        console.log(`Error duplicating playground with id ${playground}:, error)`)
    }
}

// Toggles the current user's starred state for one playground so both table and sidebar stay in sync.
export const togglePlaygroundStarMark = async (playgroundId: string) => {
    const user = await currentUser()
    if (!user) {
        throw new Error("Unauthorized")
    }

    try {
        const playground = await db.playground.findUnique({
            where: {
                id: playgroundId,
            },
            select: {
                id: true,
                userId: true,
            },
        })

        if (!playground || playground.userId !== user.id) {
            throw new Error("Playground not found")
        }

        const existingMark = await db.starMark.findUnique({
            where: {
                userId_playgroundId: {
                    userId: user.id,
                    playgroundId,
                },
            },
            select: {
                id: true,
                isMarked: true,
            },
        })

        const updatedMark = existingMark
            ? await db.starMark.update({
                where: {
                    id: existingMark.id,
                },
                data: {
                    isMarked: !existingMark.isMarked,
                },
            })
            : await db.starMark.create({
                data: {
                    userId: user.id,
                    playgroundId,
                    isMarked: true,
                },
            })

        revalidatePath("/dashboard")
        return updatedMark
    } catch (error) {
        console.log(`Error toggling star mark for playground ${playgroundId}:`, error)
        throw error
    }
}