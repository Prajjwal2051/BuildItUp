// This API route handles loading and saving the playground template JSON, which captures the file tree state for each playground. It uses a single database row per playground to store the latest template snapshot. The GET method retrieves the template data for a given playground ID, while the PUT method updates or creates the template data for that playground. Both methods include error handling to ensure robust responses in case of missing parameters, invalid input, or database issues.

import { auth } from '@/auth'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { getTemplateAbsolutePath, type TemplateId } from '@/lib/template'
import { pathToJson } from '@/modules/playground/lib/path-to-json'

type RouteParams = { id?: string | string[] }
type TemplateFileContentInput = NonNullable<
    Parameters<typeof db.templateFile.create>[0]['data']['content']
>

// Verifies that the playground exists and belongs to the current user before any template access.
async function getOwnedPlayground(playgroundId: string, userId: string) {
    const playground = await db.playground.findUnique({
        where: {
            id: playgroundId,
        },
        select: {
            id: true,
            userId: true,
            template: true,
            code: true,
        },
    })

    if (!playground || playground.userId !== userId) {
        return null
    }

    return playground
}

// Normalizes dynamic route params so both string and catch-all array values resolve safely.
function getRouteId(params: RouteParams): string | null {
    const rawId = params.id
    if (!rawId) {
        return null
    }
    if (Array.isArray(rawId)) {
        return rawId[0] ?? null
    }
    return rawId
}

// Loads saved template JSON for one playground so the editor can restore file tree state.
async function GET(_request: NextRequest, context: { params: RouteParams | Promise<RouteParams> }) {

    // The GET function retrieves the saved template JSON for a specific playground based on the provided playground ID. It queries the database for the template file associated with the given playground ID and returns its content and last updated timestamp. If the playground ID is missing, if the template file is not found, or if there is an error during the database query, it returns an appropriate error response with a corresponding status code.

    const session = await auth()
    if (!session?.user?.id) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const resolvedParams = await Promise.resolve(context.params)
    const id = getRouteId(resolvedParams)

    if (!id) {
        return Response.json({ error: 'Playground ID is required' }, { status: 400 })
    }

    try {
        const playground = await getOwnedPlayground(id, session.user.id)
        if (!playground) {
            return Response.json({ error: 'Playground not found' }, { status: 404 })
        }

        const templateFile = await db.templateFile.findUnique({
            where: {
                playgroundId: id,
            },
            select: {
                content: true,
                updatedAt: true,
            },
        })

        // Existing rows may store JSON directly or as a serialized string from older writes.
        if (templateFile) {
            let normalizedContent = templateFile.content
            if (typeof normalizedContent === 'string') {
                try {
                    normalizedContent = JSON.parse(normalizedContent)
                } catch {
                    normalizedContent = null
                }
            }

            if (normalizedContent) {
                return Response.json(
                    {
                        content: normalizedContent,
                        updatedAt: templateFile.updatedAt,
                    },
                    { status: 200 },
                )
            }
        }

        // If a code snapshot exists, use it first so users get exactly what was previously stored.
        if (typeof playground.code === 'string' && playground.code.trim().length > 0) {
            try {
                const parsedCode = JSON.parse(playground.code)
                return Response.json(
                    {
                        content: parsedCode,
                        updatedAt: new Date().toISOString(),
                    },
                    { status: 200 },
                )
            } catch {
                // If code is not valid JSON, continue with starter template fallback.
            }
        }

        // Last-resort fallback: rebuild starter template from disk so editor can always load initial files.
        const starterTemplate = await pathToJson(
            getTemplateAbsolutePath(playground.template as TemplateId),
            {
                includeFileContent: true,
                ignore: [
                    'node_modules',
                    '.git',
                    '.next',
                    'dist',
                    'build',
                    'package-lock.json',
                    'pnpm-lock.yaml',
                    'yarn.lock',
                ],
            },
        )

        // Persist fallback once so future reads become fast and consistent.
        const savedTemplate = await db.templateFile.upsert({
            where: { playgroundId: id },
            update: { content: starterTemplate as TemplateFileContentInput },
            create: {
                playgroundId: id,
                content: starterTemplate as TemplateFileContentInput,
            },
            select: {
                updatedAt: true,
            },
        })

        return Response.json(
            {
                content: starterTemplate,
                updatedAt: savedTemplate.updatedAt,
            },
            { status: 200 },
        )
    } catch (error) {
        console.error('Error loading template file:', error)
        return Response.json({ error: 'Failed to load template data' }, { status: 500 })
    }
}

// Saves updated template JSON for one playground and keeps a single row per playground.
async function PUT(request: NextRequest, context: { params: RouteParams | Promise<RouteParams> }) {

    // The PUT function saves the updated template JSON for a specific playground based on the provided playground ID. It first validates the presence of the playground ID and the template content in the request body. If the validation passes, it checks if a playground with the given ID exists in the database. If it does, it performs an upsert operation to either update the existing template file or create a new one associated with the playground. Finally, it returns a success response with the template file ID and last updated timestamp. If any validation fails or if there is an error during the database operations, it returns an appropriate error response with a corresponding status code.

    const session = await auth()
    if (!session?.user?.id) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const resolvedParams = await Promise.resolve(context.params)
    const id = getRouteId(resolvedParams)

    if (!id) {
        return Response.json({ error: 'Playground ID is required' }, { status: 400 })
    }

    let payload: { content?: unknown }
    try {
        payload = await request.json()
    } catch {
        return Response.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (payload.content === undefined) {
        return Response.json({ error: 'Template content is required' }, { status: 400 })
    }

    if (payload.content === null) {
        return Response.json({ error: 'Template content cannot be null' }, { status: 400 })
    }

    const content = payload.content as TemplateFileContentInput

    try {
        const playground = await getOwnedPlayground(id, session.user.id)

        if (!playground) {
            return Response.json({ error: 'Playground not found' }, { status: 404 })
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
            { status: 200 },
        )
    } catch (error) {
        console.error('Error saving template file:', error)
        return Response.json({ error: 'Failed to save template data' }, { status: 500 })
    }
}

export { GET, PUT }
