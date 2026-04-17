import { auth } from '@/auth'
import { db } from '@/lib/db'
import redis from '@/lib/redis'
import { NextResponse } from 'next/server'

function sessionKey(playgroundId: string): string {
    return `collab:session:${playgroundId}`
}

function opsKey(playgroundId: string): string {
    return `collab:ops:${playgroundId}`
}

function presenceKey(playgroundId: string): string {
    return `collab:presence:${playgroundId}`
}

function stoppedKey(playgroundId: string): string {
    return `collab:stopped:${playgroundId}`
}

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ playgroundId: string }> },
) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { playgroundId } = await params
    if (!playgroundId) {
        return NextResponse.json({ error: 'playgroundId is required' }, { status: 400 })
    }

    const playground = await db.playground.findFirst({
        where: {
            id: playgroundId,
            userId: session.user.id,
        },
        select: { id: true },
    })

    if (!playground) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await Promise.all([
        db.shareLink.updateMany({
            where: {
                playgroundId,
                isRevoked: false,
            },
            data: {
                isRevoked: true,
            },
        }),
        redis.del(sessionKey(playgroundId)),
        redis.del(opsKey(playgroundId)),
        redis.del(presenceKey(playgroundId)),
        redis.set(stoppedKey(playgroundId), '1', 'EX', 24 * 60 * 60),
    ])

    return NextResponse.json({ ok: true })
}
