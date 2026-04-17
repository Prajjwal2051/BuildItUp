// ─────────────────────────────────────────────────────────────────
// SHARE LINK METADATA API
// GET /api/share/[token]/meta
// Public endpoint that validates token status and returns share metadata.
// ─────────────────────────────────────────────────────────────────

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string }> },
) {
    const { token } = await params   // ← await here

    const link = await db.shareLink.findFirst({
        where: { token },
        include: {
            createdBy: {
                select: { name: true },
            },
        },
    })
    if (!link) {
        return NextResponse.json({ error: 'Link Not found' }, { status: 404 })
    }

    if (link.isRevoked) {
        return NextResponse.json({ error: 'Link Revoked' }, { status: 410 })
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
        return NextResponse.json({ error: 'Link Expired' }, { status: 410 })
    }

    await db.shareLink.update({
        where: { id: link.id },
        data: { accessCount: { increment: 1 } },
    })

    return NextResponse.json({
        permission: link.permission,
        playgroundId: link.playgroundId,
        expiresAt: link.expiresAt,
        ownerName: link.createdBy?.name ?? null,
    })
}