import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import { NextRequest } from "next/server"

// Loads saved template JSON for one playground so the editor can restore file tree state.
async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
    // The GET function retrieves the saved template JSON for a specific playground based on the provided playground ID. It queries the database for the template file associated with the given playground ID and returns its content and last updated timestamp. If the playground ID is missing, if the template file is not found, or if there is an error during the database query, it returns an appropriate error response with a corresponding status code.
    const { id } = params

    if (!id) {
        return Response.json({ error: "Playground ID is required" }, { status: 400 })
    }

    try {
        const templateFile = await db.templateFile.findUnique({
            where: {
                playgroundId: id,
            },
            select: {
                content: true,
                updatedAt: true,
            },
        })

        if (!templateFile) {
            return Response.json({ error: "Template file not found" }, { status: 404 })
        }

        return Response.json(
            {
                content: templateFile.content,
                updatedAt: templateFile.updatedAt,
            },
            { status: 200 }
        )
    } catch (error) {
        console.error("Error loading template file:", error)
        return Response.json({ error: "Failed to load template data" }, { status: 500 })
    }
}

// Saves updated template JSON for one playground and keeps a single row per playground.
async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    // The PUT function saves the updated template JSON for a specific playground based on the provided playground ID. It first validates the presence of the playground ID and the template content in the request body. If the validation passes, it checks if a playground with the given ID exists in the database. If it does, it performs an upsert operation to either update the existing template file or create a new one associated with the playground. Finally, it returns a success response with the template file ID and last updated timestamp. If any validation fails or if there is an error during the database operations, it returns an appropriate error response with a corresponding status code.
    const { id } = params

    if (!id) {
        return Response.json({ error: "Playground ID is required" }, { status: 400 })
    }

    let payload: { content?: unknown }
    try {
        payload = await request.json()
    } catch {
        return Response.json({ error: "Invalid request body" }, { status: 400 })
    }

    if (payload.content === undefined) {
        return Response.json({ error: "Template content is required" }, { status: 400 })
    }

    if (payload.content === null) {
        return Response.json({ error: "Template content cannot be null" }, { status: 400 })
    }

    const content = payload.content as Prisma.InputJsonValue

    try {
        const playground = await db.playground.findUnique({
            where: {
                id,
            },
            select: {
                id: true,
            },
        })

        if (!playground) {
            return Response.json({ error: "Playground not found" }, { status: 404 })
        }

        // Upsert keeps one template snapshot per playground while allowing first-save creation.
        const savedTemplate = await db.templateFile.upsert({
            where: {
                playgroundId: id,
            },
            update: {
                content,
            },
            create: {
                playgroundId: id,
                content,
            },
            select: {
                id: true,
                updatedAt: true,
            },
        })

        return Response.json(
            {
                success: true,
                templateFileId: savedTemplate.id,
                updatedAt: savedTemplate.updatedAt,
            },
            { status: 200 }
        )
    } catch (error) {
        console.error("Error saving template file:", error)
        return Response.json({ error: "Failed to save template data" }, { status: 500 })
    }
}

export {
    GET,
    PUT,
}