// this file is used in the playground page to fetch the meta information of a shared playground

export async function getSharedPlaygroundMeta(token: string) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/share/${token}/meta`, {
        cache: 'no-store',
    })

    if (!res.ok) return null

    return res.json() as Promise<{
        permission: 'VIEWONLY' | 'VIEWANDEDIT'
        playgroundId: string
        expiresAt: string | null
        ownerName: string | null
    }>
}
