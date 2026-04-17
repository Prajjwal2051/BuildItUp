import { auth } from '@/auth'
import { db } from '@/lib/db'
import redis from '@/lib/redis'
import { NextResponse } from 'next/server'

type PresenceUser = {
    userId: string
    displayName: string
    avatar?: string
    color: string
    cursor: null
    isActive: boolean
}

type PresencePayload = {
    active?: boolean
    users?: PresenceUser[]
    updatedAt?: number
}

function presenceKey(playgroundId: string): string {
    return `collab:presence:${playgroundId}`
}

function stoppedKey(playgroundId: string): string {
    return `collab:stopped:${playgroundId}`
}

export async function GET(
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

    const [rawPresence, stoppedFlag] = await Promise.all([
        redis.get(presenceKey(playgroundId)),
        redis.get(stoppedKey(playgroundId)),
    ])

    let users: PresenceUser[] = []
    let updatedAt: number | null = null

    if (rawPresence) {
        try {
            const parsed = JSON.parse(rawPresence) as PresencePayload
            if (Array.isArray(parsed.users)) {
                users = parsed.users.filter((user) =>
                    Boolean(user && typeof user.userId === 'string' && typeof user.color === 'string'),
                )
            }
            if (typeof parsed.updatedAt === 'number') {
                updatedAt = parsed.updatedAt
            }
        } catch {
            users = []
        }
    }

    return NextResponse.json({
        activeUsers: users,
        activeCount: users.length,
        sessionOn: users.length > 0 && stoppedFlag !== '1',
        stopped: stoppedFlag === '1',
        updatedAt,
    })
}
