const palette = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
]

/**
 * Returns a stable color for a given user id.
 */
export function userColor(userId: string): string {
    let hash = 0

    for (let i = 0; i < userId.length; i++) {
        hash = (hash << 5) - hash + userId.charCodeAt(i)
        hash |= 0
    }

    const index = Math.abs(hash) % palette.length
    return palette[index]
}
