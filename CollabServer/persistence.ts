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

type SessionFile = {
    path: string
    content: string
}

function parseMaybeNestedJson(value: unknown): unknown {
    let current = value

    for (let i = 0; i < 5; i += 1) {
        if (typeof current !== 'string') return current
        const text = current.trim()
        if (!text) return current

        const looksJson =
            text.startsWith('{') ||
            text.startsWith('[') ||
            text.startsWith('"{') ||
            text.startsWith('"[')
        if (!looksJson) return current

        try {
            current = JSON.parse(text)
        } catch {
            return current
        }
    }

    return current
}

function normalizePath(pathLike: string): string {
    return pathLike.replace(/^\/+/, '').replace(/\\/g, '/').trim()
}

function toTextContent(value: unknown): string {
    if (typeof value === 'string') return value
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
}

function extractSessionFiles(value: unknown): SessionFile[] {
    const parsed = parseMaybeNestedJson(value)

    if (typeof parsed === 'string') {
        return [{ path: 'main.ts', content: parsed }]
    }

    if (!parsed || typeof parsed !== 'object') {
        return []
    }

    const root = parsed as Record<string, unknown>

    if (Array.isArray(root.files)) {
        const files = root.files
            .map((entry) => {
                if (!entry || typeof entry !== 'object') return null
                const file = entry as Record<string, unknown>
                const rawPath =
                    (typeof file.path === 'string' && file.path) ||
                    (typeof file.filename === 'string' && file.filename) ||
                    (typeof file.name === 'string' && file.name) ||
                    ''
                const path = normalizePath(rawPath)
                if (!path) return null
                return {
                    path,
                    content: toTextContent(file.content ?? file.code ?? file.text ?? ''),
                }
            })
            .filter((file): file is SessionFile => file !== null)
        if (files.length > 0) return files
    }

    const extracted: SessionFile[] = []

    const walkTemplateTree = (node: unknown): void => {
        if (!node || typeof node !== 'object') return
        const record = node as Record<string, unknown>
        const type = record.type

        if (type === 'file') {
            const rawPath =
                (typeof record.path === 'string' && record.path) ||
                (typeof record.name === 'string' && record.name) ||
                'main.ts'
            const path = normalizePath(rawPath)
            if (!path) return
            extracted.push({
                path,
                content: toTextContent(record.content ?? ''),
            })
            return
        }

        if (type === 'directory' || type === 'folder') {
            const children = Array.isArray(record.children) ? record.children : []
            for (const child of children) {
                walkTemplateTree(child)
            }
        }
    }

    const walkRuntimeTemplate = (item: unknown, parentPath: string): void => {
        if (!item || typeof item !== 'object') return
        const record = item as Record<string, unknown>

        const folderName =
            typeof record.folderName === 'string' && record.folderName.trim()
                ? record.folderName.trim()
                : ''

        if (folderName) {
            const nextParent = parentPath ? `${parentPath}/${folderName}` : folderName
            const children = Array.isArray(record.items) ? record.items : []
            for (const child of children) {
                walkRuntimeTemplate(child, nextParent)
            }
            return
        }

        const filename =
            typeof record.filename === 'string' && record.filename.trim()
                ? record.filename.trim()
                : ''
        if (!filename) return

        const extension =
            typeof record.fileExtension === 'string' && record.fileExtension.trim()
                ? record.fileExtension.trim().replace(/^\.+/, '')
                : ''

        const finalName =
            extension && !filename.toLowerCase().endsWith(`.${extension.toLowerCase()}`)
                ? `${filename}.${extension}`
                : filename
        const path = normalizePath(parentPath ? `${parentPath}/${finalName}` : finalName)
        if (!path) return

        extracted.push({
            path,
            content: toTextContent(record.content ?? ''),
        })
    }

    walkTemplateTree(root)
    if (extracted.length > 0) return extracted

    const runtimeItems = Array.isArray(root.items) ? root.items : null
    if (runtimeItems) {
        for (const item of runtimeItems) {
            walkRuntimeTemplate(item, '')
        }
    }
    if (extracted.length > 0) return extracted

    const mapFiles = Object.entries(root)
        .filter(([key]) => key.includes('.'))
        .map(([key, entry]) => ({
            path: normalizePath(key),
            content: toTextContent(entry),
        }))
        .filter((file) => file.path)

    if (mapFiles.length > 0) {
        return mapFiles
    }

    return []
}

function toCanonicalSessionContent(value: unknown): string {
    const files = extractSessionFiles(value)
    if (files.length > 0) {
        return JSON.stringify({
            files: files.map((file) => ({
                path: file.path,
                content: file.content,
            })),
        })
    }

    const parsed = parseMaybeNestedJson(value)
    if (typeof parsed === 'string') {
        return JSON.stringify({
            files: [{ path: 'main.ts', content: parsed }],
        })
    }

    return JSON.stringify({
        files: [{ path: 'main.ts', content: '' }],
    })
}

function normalizeStoredSnapshot(value: unknown): string {
    if (typeof value === 'string') {
        const decoded = decodeSnapshotContent(value)
        return toCanonicalSessionContent(decoded)
    }

    if (value === null || value === undefined) {
        return toCanonicalSessionContent('')
    }

    return toCanonicalSessionContent(value)
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
        select: { content: true },
    })

    let initialContent = ''

    if (templateFile) {
        initialContent = normalizeStoredSnapshot(templateFile.content)
    } else {
        const playground = await db.playground.findUnique({
            where: { id: playgroundId },
            select: { code: true },
        })

        if (playground?.code) {
            initialContent = normalizeStoredSnapshot(playground.code)
        }
    }

    const initial: DocumentState = {
        revision: 0,
        content: initialContent,
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