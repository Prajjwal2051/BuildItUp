import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import redis from '@/lib/redis'

function sessionKey(playgroundId: string) {
    return `collab:session:${playgroundId}`
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params

    // 1. Validate the share token
    let playgroundId: string
    try {
        const link = await db.shareLink.findUnique({
            where: { token },
            select: {
                playgroundId: true,
                isRevoked: true,
                expiresAt: true,
            },
        })

        if (!link || link.isRevoked) {
            return NextResponse.json({ error: 'Link not found or revoked' }, { status: 404 })
        }
        if (link.expiresAt && link.expiresAt < new Date()) {
            return NextResponse.json({ error: 'Link expired' }, { status: 410 })
        }
        playgroundId = link.playgroundId
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // 2. Try Redis for live content first (collab session may be active)
    try {
        const cached = await redis.get(sessionKey(playgroundId))
        if (cached) {
            const session = JSON.parse(cached) as { content: string; revision: number }
            // content is stored as JSON-stringified file tree in collab sessions
            let parsedContent: unknown
            try {
                parsedContent = JSON.parse(session.content)
            } catch {
                parsedContent = session.content
            }
            return NextResponse.json(
                { playgroundId, content: parsedContent, revision: session.revision, source: 'redis' },
                { headers: { 'Cache-Control': 'no-store' } }
            )
        }
    } catch {
        // Redis miss or unavailable — fall through to DB
    }

    // 3. Fall back to DB
    try {
        const [playground, templateFile] = await Promise.all([
            db.playground.findUnique({
                where: { id: playgroundId },
                select: { id: true, name: true },
            }),
            db.templateFile.findUnique({
                where: { playgroundId },
                select: { content: true },
            }),
        ])

        if (!playground) {
            return NextResponse.json({ error: 'Playground not found' }, { status: 404 })
        }

        return NextResponse.json(
            {
                playgroundId,
                name: playground.name,
                content: templateFile?.content ?? null,
                revision: 0,
                source: 'db',
            },
            { headers: { 'Cache-Control': 'no-store' } }
        )
    } catch {
        return NextResponse.json({ error: 'Failed to load playground' }, { status: 500 })
    }
}
