import { db } from '@/lib/db'

export async function getSharedPlaygroundMeta(token: string) {
    try {
        const link = await db.shareLink.findUnique({
            where: { token },
            select: {
                playgroundId: true,
                permission: true,
                isRevoked: true,
                expiresAt: true,
            },
        })

        if (!link || link.isRevoked) {
            return null
        }

        if (link.expiresAt && link.expiresAt < new Date()) {
            return null
        }

        return {
            playgroundId: link.playgroundId,
            permission: link.permission,
        }
    } catch (error) {
        console.error('Error fetching shared playground meta:', error)
        return null
    }
}
