// ─────────────────────────────────────────────────────────────────
// PLAYGROUND SHARE LINKS API
// GET /api/share/playground/[playgroundId]/links
// Owner-only endpoint that lists active (not revoked, not expired) links.
// ─────────────────────────────────────────────────────────────────

import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
    _request: Request,
    { params }: { params: { playgroundId: string } },
) {
    // 1) Verify session.
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { playgroundId } = params
    if (!playgroundId) {
        return NextResponse.json({ error: 'playgroundId is required' }, { status: 400 })
    }

    // 2) Ensure the requester owns the playground.
    const playground = await db.playground.findFirst({
        where: {
            id: playgroundId,
            userId: session.user.id,
        },
    })

    if (!playground) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3) Return active links (not revoked and not expired).
    const now = new Date()
    const links = await db.shareLink.findMany({
        where: {
            playgroundId,
            isRevoked: false,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            token: true,
            permission: true,
            expiresAt: true,
            accessCount: true,
            createdAt: true,
        },
    })

    return NextResponse.json({ links })
}
