// ─────────────────────────────────────────────────────────────────
// CONNECTION MANAGER
// Handles socket auth, room membership, operations, cursors, and cleanup.
// ─────────────────────────────────────────────────────────────────

import { db } from "@/lib/db"
import { verifyShareToken } from "@/lib/share-token"
import { userColor } from "@/lib/user-color"
import type WebSocket from "ws"
import type { RawData } from "ws"
import type {
    ClientMessage,
    ServerMessage,
    TextOperations,
    User,
    CursorRange,
} from "./types"
import { getDocumentState, setDocumentState, appendOperation } from "./ot/sessions"
import { apply, transform } from "./ot/engine"
import { loadSession, saveSession, pushOpToHistory, flushToDB, markSessionActivity } from "./persistence"
import { broadCastCursor, broadCastJoin, broadcastLeave, Room, RoomClient } from "./presence"

// In-memory room index: playgroundId -> connected room members.
const rooms = new Map<string, Room>()  // playgroundId -> room (set of clients in that playground)

// Reverse lookup to find a socket's room/client metadata quickly.
const clientToRoom = new Map<WebSocket, {
    roomId: string,
    client: RoomClient
}>()

// Routes incoming websocket payloads to the right handler after basic JSON decoding.
export async function handleMessage(ws: WebSocket, raw: RawData) {
    let msg: ClientMessage
    try {
        msg = JSON.parse(raw.toString()) as ClientMessage
    } catch (error) {
        ws.send(JSON.stringify({
            type: "error",
            code: "INVALID_FORMAT",
            message: "Invalid message format"
        }))
        return
    }

    switch (msg.type) {
        case "auth":
            await handleAuth(ws, msg.token, msg.userId)
            break
        case "operation":
            await handleOperation(ws, msg.rev, msg.op)
            break
        case "cursor":
            handleCursor(ws, msg.rev, msg.cursor)
            break
        case "ping":
            ws.send(JSON.stringify({ type: "pong" } as ServerMessage))
            break
        default:
            ws.send(JSON.stringify({
                type: "error",
                code: "UNKNOWN_TYPE",
                message: "Unknown message type"
            }))
    }
}

function send(ws: WebSocket, msg: ServerMessage) {
    ws.send(JSON.stringify(msg))
}

function getClientByUserId(room: Room, userId: string): RoomClient | null {
    for (const client of room) {
        if (client.userId === userId) {
            return client
        }
    }
    return null
}

function toRange(op: TextOperations) {
    if (op.type === 'insert') {
        return { start: op.position, end: op.position }
    }

    if (op.type === 'delete') {
        return { start: op.position, end: op.position + op.length }
    }

    return { start: 0, end: 0 }
}

function rangesOverlap(a: TextOperations, b: TextOperations): boolean {
    if (a.type === 'retain' || b.type === 'retain') return false

    const rangeA = toRange(a)
    const rangeB = toRange(b)
    return rangeA.start <= rangeB.end && rangeB.start <= rangeA.end
}

// Validates a share token against the DB and signature and returns its playground mapping.
async function resolvePlaygroundIdFromToken(token: string): Promise<{ playgroundId: string | null }> {
    if (!verifyShareToken(token)) {
        return { playgroundId: null }
    }

    let tokenPlaygroundId: string | null = null
    try {
        const decoded = Buffer.from(token, "base64url").toString("utf8")
        const parts = decoded.split(":")
        if (parts.length !== 3) {
            return { playgroundId: null }
        }
        tokenPlaygroundId = parts[0]
    } catch {
        return { playgroundId: null }
    }

    const link = await db.shareLink.findUnique({ where: { token } })
    if (!link || link.isRevoked) {
        return { playgroundId: null }
    }

    if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) {
        return { playgroundId: null }
    }

    if (!tokenPlaygroundId || tokenPlaygroundId !== link.playgroundId) {
        return { playgroundId: null }
    }

    return { playgroundId: link.playgroundId }
}

// Authenticates a socket, joins it to a room, and sends initial document state.
async function handleAuth(ws: WebSocket, token: string, userId?: string) {
    const { playgroundId } = await resolvePlaygroundIdFromToken(token)

    if (!playgroundId) {
        ws.send(JSON.stringify({
            type: "error",
            code: "INVALID_TOKEN",
            message: "Invalid token"
        }))
        return
    }

    // Load current document state (memory first, then persistence fallback).
    let state = getDocumentState(playgroundId)
    if (!state) {
        state = await loadSession(playgroundId)
        setDocumentState(playgroundId, state)
    }
    markSessionActivity(playgroundId)

    // Ensure a room exists for this playground.
    let room = rooms.get(playgroundId)
    if (!room) {
        room = new Set()
        rooms.set(playgroundId, room)
    }

    // Keep IDs deterministic for signed-in users and random for guests.
    const id = userId ?? `guest-${Math.random().toString(36).slice(2)}`
    const color = userColor(id)

    const client: RoomClient = { ws, userId: id, color }
    room.add(client)
    clientToRoom.set(ws, { roomId: playgroundId, client })

    // Presence payload used for join/leave broadcasts and user list rendering.
    const presence: User = {
        userId: id,
        displayName: id,
        avatar: undefined,
        color,
        cursor: null,
        isActive: true
    }
    // Build a list of already connected users to initialize the new client.
    const users: User[] = Array.from(room)
        .filter((c) => c !== client)
        .map((c) => ({
            userId: c.userId,
            displayName: c.userId,
            avatar: undefined,
            color: c.color,
            cursor: null,
            isActive: true,
        }))

    send(ws, {
        type: "init",
        rev: state.revision,
        content: state.content,
        users,
        selfUserId: id,
    })

    // Notify everyone else that a new collaborator joined.
    broadCastJoin(room, presence, client)
}

// Applies incoming edits, transforms stale operations, then acks and broadcasts.
async function handleOperation(ws: WebSocket, rev: number, op: TextOperations) {
    const mapping = clientToRoom.get(ws)
    if (!mapping) return
    const { roomId, client } = mapping

    let state = getDocumentState(roomId)
    if (!state) {
        state = await loadSession(roomId)
    }

    const beforeContent = state.content

    // If client is behind, shift the incoming op over all unseen server-side ops.
    let transformedOp = op
    if (rev < state.revision) {
        const unseenOps = state.operations.filter((entry) => entry.rev > rev)
        for (const appliedOp of unseenOps) {
            transformedOp = transform(transformedOp, appliedOp.op)
        }
    }

    // Apply op to content
    const newContent = apply(state.content, transformedOp)
    const newRev = state.revision + 1

    state.content = newContent
    state.revision = newRev
    appendOperation(roomId, {
        rev: newRev,
        op: transformedOp,
        authorId: client.userId,
        beforeContent,
    })
    await pushOpToHistory(roomId, {
        rev: newRev,
        op: transformedOp,
        authorId: client.userId,
        beforeContent,
    })
    await saveSession(roomId)
    markSessionActivity(roomId)

    // Ack only to the sender so client can advance its local revision.
    send(ws, { type: "acknowledgment", rev: newRev })

    // Broadcast the transformed operation to all other clients in the room.
    const room = rooms.get(roomId)
    if (!room) return
    const msg: ServerMessage = {
        type: "operation",
        rev: newRev,
        op: transformedOp,
        authorId: client.userId,
    }
    for (const c of room) {
        if (c === client) continue
        c.ws.send(JSON.stringify(msg))
    }

    // If a recent edit touched the same range, send a conflict payload to both clients.
    const recentConflicts = state.operations.filter((entry) => {
        if (entry.authorId === client.userId) return false
        return Date.now() - entry.timestamp <= 500 && rangesOverlap(entry.op, transformedOp)
    })

    for (const entry of recentConflicts) {
        const firstClient = getClientByUserId(room, entry.authorId)
        const secondClient = getClientByUserId(room, client.userId)
        if (!firstClient || !secondClient) continue

        const conflictMsg: ServerMessage = {
            type: 'conflict',
            authorAId: entry.authorId,
            authorBId: client.userId,
            opA: entry.op,
            opB: transformedOp,
            baseContent: entry.beforeContent,
            contentA: apply(entry.beforeContent, entry.op),
            contentB: apply(entry.beforeContent, transformedOp),
        }

        firstClient.ws.send(JSON.stringify(conflictMsg))
        secondClient.ws.send(JSON.stringify(conflictMsg))
    }
}

// Broadcasts cursor movements so collaborators can see live selections.
function handleCursor(ws: WebSocket, _rev: number, range: CursorRange) {
    const mapping = clientToRoom.get(ws)
    if (!mapping) return
    const { roomId, client } = mapping

    const room = rooms.get(roomId)
    if (!room) return

    broadCastCursor(room, client, range)
}

export async function handleDisconnect(ws: WebSocket) {
    const mapping = clientToRoom.get(ws)
    if (!mapping) return
    clientToRoom.delete(ws)

    const { roomId, client } = mapping
    const room = rooms.get(roomId)
    if (!room) return

    room.delete(client)
    broadcastLeave(room, client.userId)

    if (room.size === 0) {
        // Last user left: flush final state and clean room/session caches.
        await flushToDB(roomId)
        rooms.delete(roomId)
    }
}


