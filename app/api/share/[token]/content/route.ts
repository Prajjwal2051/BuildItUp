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

        const playgroundId = link.playgroundId

        try {
            const cached = await redis.get(sessionKey(playgroundId))
            if (cached) {
                const session = JSON.parse(cached) as { content: string; revision: number }
                let parsedContent: unknown
                try {
                    parsedContent = JSON.parse(session.content)
                } catch {
                    parsedContent = session.content
                }

                return NextResponse.json(
                    {
                        playgroundId,
                        content: parsedContent,
                        revision: session.revision,
                        source: 'redis',
                    },
                    { headers: { 'Cache-Control': 'no-store' } }
                )
            }
        } catch (redisError) {
            console.warn('Share content route: Redis read failed', redisError)
        }

        const playground = await db.playground.findUnique({
            where: { id: playgroundId },
            select: { id: true, title: true },
        })

        if (!playground) {
            return NextResponse.json({ error: 'Playground not found' }, { status: 404 })
        }

        let templateFile = null
        try {
            templateFile = await db.templateFile.findFirst({
                where: { playgroundId },
                select: { content: true },
            })
        } catch (templateError) {
            console.error('Share content route: template lookup failed', templateError)
            return NextResponse.json(
                {
                    error:
                        templateError instanceof Error
                            ? templateError.message
                            : 'Template lookup failed',
                },
                { status: 500 }
            )
        }

        return NextResponse.json(
            {
                playgroundId,
                name: playground.title,
                content: templateFile?.content ?? '',
                revision: 0,
                source: 'db',
            },
            { headers: { 'Cache-Control': 'no-store' } }
        )
    } catch (error) {
        console.error('Share content route failed:', error)
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Internal server error',
            },
            { status: 500 }
        )
    }
}