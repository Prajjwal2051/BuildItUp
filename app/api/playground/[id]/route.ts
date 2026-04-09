// This API route handles fetching a single playground by its ID, returning the latest template snapshot for editor bootstrapping.

import { db } from '@/lib/db'
import { auth } from '@/auth'
import { NextRequest } from 'next/server'

type RouteParams = { id?: string | string[] }

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

// Loads a single playground and returns its latest template snapshot so the editor can bootstrap state.
async function GET(_request: NextRequest, context: { params: RouteParams | Promise<RouteParams> }) {
    // first we will resolve the session- reject if the user is not authenticated
    const session=await auth()
    if(!session?.user?.id){
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const resolvedParams = await Promise.resolve(context.params)
    const id = getRouteId(resolvedParams)

    if (!id) {
        return Response.json({ error: 'Playground ID is required' }, { status: 400 })
    }

    try {
        const playground = await db.playground.findUnique({
            where: { 
                id,
                userId: session.user.id, // Ensure the user can only access their own playgrounds
             },
            select: {
                id: true,
                title: true,
                description: true,
                template: true,
                code: true,
                createdAt: true,
                updatedAt: true,
            },
        })

        if (!playground) {
            return Response.json({ error: 'Playground not found' }, { status: 404 })
        }

        // TemplateFile is optional for older/new rows, so fetch it separately and normalize to null when absent.
        const templateFile = await db.templateFile.findUnique({
            where: { playgroundId: id },
            select: {
                id: true,
                content: true,
                updatedAt: true,
            },
        })

        return Response.json(
            {
                ...playground,
                templateFile: templateFile ?? null,
            },
            { status: 200 },
        )
    } catch (error) {
        console.error('Error fetching playground:', error)
        return Response.json({ error: 'Failed to fetch playground data' }, { status: 500 })
    }
}

export { GET }
