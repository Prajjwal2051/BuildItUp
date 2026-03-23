import { db } from "@/lib/db"
import { NextRequest } from "next/server"

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
async function GET(
    _request: NextRequest,
    context: { params: RouteParams | Promise<RouteParams> }
) {
    const resolvedParams = await Promise.resolve(context.params)
    const id = getRouteId(resolvedParams)

    if (!id) {
        return Response.json({ error: "Playground ID is required" }, { status: 400 })
    }

    try {
        const playground = await db.playground.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                description: true,
                template: true,
                createdAt: true,
                updatedAt: true,
                templateFile: {
                    select: {
                        id: true,
                        content: true,
                        updatedAt: true,
                    },
                    take: 1,
                },
            },
        })

        if (!playground) {
            return Response.json({ error: "Playground not found" }, { status: 404 })
        }

        const [templateFile] = playground.templateFile
        return Response.json(
            {
                ...playground,
                templateFile: templateFile ?? null,
            },
            { status: 200 }
        )
    } catch (error) {
        console.error("Error fetching playground:", error)
        return Response.json({ error: "Failed to fetch playground data" }, { status: 500 })
    }
}

export { GET }
