// ─────────────────────────────────────────────────────────────────
// SHARE LINK REVOKE API
// DELETE /api/share/[token]/revoke
// Owner-only endpoint that invalidates an existing share token.
// ─────────────────────────────────────────────────────────────────

import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(
    _request: Request,
    { params }: { params: { token: string } },
) {
    // 1) Verify session.
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

    // 2) Resolve token and enforce ownership.
    const { token } = params

    const link = await db.shareLink.findFirst({
        where: {
            token,
        },
    })
    if (!link) {
        return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }
    if (session.user.id !== link.createdById) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3) Revoke token.
    try {
        await db.shareLink.update({
            where: {
                token: token,
            },
            data: {
                isRevoked: true,
            },
        })
    } catch {
        return NextResponse.json(
            {
                error: 'Failed to Revoke Permissions',
            },
            {
                status: 500,
            },
        )
    }

    // 4) Return success response.
    return NextResponse.json({ ok: true })
}
