// ─────────────────────────────────────────────────────────────────
// PERSISTENCE LAYER
// Bridges in-memory document state with Redis (hot cache) and MongoDB (source of truth).
// ─────────────────────────────────────────────────────────────────

import redis from "@/lib/redis"
import { db } from "@/lib/db"
import { getDocumentState, setDocumentState, deleteDocumentState, listDocumentStates } from "./ot/sessions"
import type { DocumentState } from "./ot/sessions"
import type { TextOperations } from "./types"

// Keep Redis-backed live sessions warm for two hours.
const session_TTL_seconds = 2 * 60 * 60
const idle_flush_ms = 30 * 1000
const periodic_flush_ms = 30 * 1000
const idleTimers = new Map<string, ReturnType<typeof setTimeout>>()
let periodicFlushTimer: ReturnType<typeof setInterval> | null = null

// Redis key for the latest full session snapshot.
function sessionKey(playgroundId: string) {
    return `collab:session:${playgroundId}`
}

// Redis key for the rolling operation history buffer.
function opsKey(playgroundId: string) {
    return `collab:ops:${playgroundId}`
}

function decodeSnapshotContent(content: string): unknown {
    const trimmed = content.trim()
    if (!trimmed) {
        return ''
    }

    try {
        return JSON.parse(trimmed)
    } catch {
        return content
    }
}

// Resets a per-playground idle timer; when it fires, session state is flushed to DB.
export function markSessionActivity(playgroundId: string): void {
    const existing = idleTimers.get(playgroundId)
    if (existing) {
        clearTimeout(existing)
    }

    const timer = setTimeout(() => {
        void flushToDB(playgroundId)
    }, idle_flush_ms)

    idleTimers.set(playgroundId, timer)
}

// Flushes every active in-memory session (used for graceful process shutdown).
export async function flushAllSessions(): Promise<void> {
    const roomIds = new Set<string>([...listDocumentStates(), ...idleTimers.keys()])
    await Promise.all(Array.from(roomIds, (roomId) => flushToDB(roomId)))
}

// Starts a periodic snapshot sync that persists active sessions without clearing cache.
export function startPeriodicFlush(): void {
    if (periodicFlushTimer) return

    periodicFlushTimer = setInterval(() => {
        const roomIds = listDocumentStates()
        for (const roomId of roomIds) {
            void syncSessionToDB(roomId)
        }
    }, periodic_flush_ms)
}

export function stopPeriodicFlush(): void {
    if (!periodicFlushTimer) return
    clearInterval(periodicFlushTimer)
    periodicFlushTimer = null
}

// Persists current content while keeping Redis and memory hot for active collaborators.
async function syncSessionToDB(playgroundId: string): Promise<void> {
    const state = getDocumentState(playgroundId)
    if (!state) return

    try {
        const snapshotContent = decodeSnapshotContent(state.content)

        await db.templateFile.upsert({
            where: { playgroundId },
            update: { content: snapshotContent as never },
            create: {
                playgroundId,
                content: snapshotContent as never,
            },
        })
    } catch (error) {
        console.error(`Failed to sync collab snapshot for ${playgroundId}`, error)
    }
}

/**
 * Load session from Redis, or from MongoDB if Redis is empty.
 */

export async function loadSession(playgroundId: string): Promise<DocumentState> {
    // Try Redis first for low-latency restore.
    const cached = await redis.get(sessionKey(playgroundId))
    if (cached) {
        const parsed = JSON.parse(cached) as DocumentState
        setDocumentState(playgroundId, parsed)  // Sync to in-memory state for fast access
        return parsed
    }

    // On cache miss, restore initial content from persistent storage.
    const templateFile = await db.templateFile.findUnique({
        where: { playgroundId },
    })

    const decodedTemplate = templateFile ? decodeSnapshotContent(JSON.stringify(templateFile.content)) : ''

    const initial: DocumentState = {
        revision: 0,
        content: typeof decodedTemplate === 'string' ? decodedTemplate : JSON.stringify(decodedTemplate),
        operations: [],
    }

    setDocumentState(playgroundId, initial)
    markSessionActivity(playgroundId)
    await redis.set(sessionKey(playgroundId), JSON.stringify(initial), "EX", session_TTL_seconds)
    return initial

}

/**
 * Save current state to Redis and reset TTL.
 */

export async function saveSession(playgroundId: string): Promise<void> {
    const state = getDocumentState(playgroundId)
    if (!state) return

    await redis.set(
        sessionKey(playgroundId),
        JSON.stringify(state),
        "EX",
        session_TTL_seconds
    )

    markSessionActivity(playgroundId)

}

/**
 * Push an op into the Redis ring buffer (max 500 ops).
 */
export async function pushOpToHistory(
    playgroundId: string,
    entry: { rev: number; op: TextOperations; authorId: string; beforeContent: string }
): Promise<void> {
    await redis.lpush(opsKey(playgroundId), JSON.stringify(entry))
    await redis.ltrim(opsKey(playgroundId), 0, 499)
}

/**
 * Flush final state to MongoDB when session ends.
 */
export async function flushToDB(playgroundId: string): Promise<void> {
    const existingTimer = idleTimers.get(playgroundId)
    if (existingTimer) {
        clearTimeout(existingTimer)
        idleTimers.delete(playgroundId)
    }

    const state = getDocumentState(playgroundId)
    if (!state) return

    // Persist final document snapshot before clearing ephemeral collab data.
    await syncSessionToDB(playgroundId)
    await redis.del(sessionKey(playgroundId))
    await redis.del(opsKey(playgroundId))
    deleteDocumentState(playgroundId)
}