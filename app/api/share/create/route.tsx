// ─────────────────────────────────────────────────────────────────
// SHARE LINK CREATION API
// POST /api/share/create
// Creates a new share link for a playground owned by the authenticated user.
// ─────────────────────────────────────────────────────────────────

import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { generateShareToken } from '@/lib/share-token'
import { db } from '@/lib/db'

type CreateShareBody = {
    playgroundId?: string
    permission?: 'VIEW_ONLY' | 'VIEW_AND_EDIT'
    expiresIn?: number // hours
}

// POST body: { playgroundId, permission, expiresIn? }
// 1) Verify authenticated session
// 2) Verify playground ownership
// 3) Generate token and persist share link
// 4) Return share URL and token
export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json(
            {
                error: 'Unauthorized',
            },
            {
                status: 401,
            },
        )
    }

    const { playgroundId, permission = 'VIEW_ONLY', expiresIn } =
        (await request.json()) as CreateShareBody

    if (!playgroundId) {
        return NextResponse.json({ error: 'playgroundId is required' }, { status: 400 })
    }

    if (permission !== 'VIEW_ONLY' && permission !== 'VIEW_AND_EDIT') {
        return NextResponse.json({ error: 'Invalid permission' }, { status: 400 })
    }

    if (expiresIn !== undefined && (!Number.isFinite(expiresIn) || expiresIn <= 0)) {
        return NextResponse.json({ error: 'expiresIn must be a positive number of hours' }, { status: 400 })
    }

    // Owner-only: user must own this playground.
    const playground = await db.playground.findFirst({
        where: {
            id: playgroundId,
            userId: session.user.id,
        },
    })
    if (!playground) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Token format/signature is handled in lib/share-token.
    const token = generateShareToken(playgroundId)
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 60 * 60 * 1000) : null

    await db.shareLink.create({
        data: {
            token,
            playgroundId,
            permission,
            createdById: session.user.id,
            expiresAt,
        },
    })

    const shareUrl = `${request.nextUrl.origin}/s/${token}`

    return NextResponse.json({
        shareUrl,
        token,
    })
}
