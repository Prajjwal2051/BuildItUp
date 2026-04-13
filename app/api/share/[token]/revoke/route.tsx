// here we will revoke the link means make the link invalid id the user requested

import { auth } from "@/auth"
import { NextResponse, NextRequest } from "next/server"
import { db } from "@/lib/db";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    // first we will verify the authentication of the user
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({
            error: "Unauthorized"
        }, {
            status: 401
        })
    }

    // now we will extract the token from routes.params
    const { token } = await params

    const link = await db.shareLink.findFirst({
        where: {
            token,
        }
    })
    if (!link) {
        return NextResponse.json({ error: "Link not found" }, { status: 404 })
    }
    if (session.user.id !== link.createdById) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    try {
        await db.shareLink.update({
            where: {
                token: token
            },
            data: {
                isRevoked: true
            }
        })

    } catch (error) {
        return NextResponse.json({
            error: "Failed to Revoke Permissions"
        }, {
            status: 500
        })
    }

    return NextResponse.json({ ok: true })

}


