// ─────────────────────────────────────────────────────────────────
// PRESENCE BROADCAST HELPERS
// Contains room-level helpers for join/leave and live cursor updates.
// ─────────────────────────────────────────────────────────────────

import type WebSocket from "ws"
import type { CursorRange, User, ServerMessage } from "./types";

export interface RoomClient {
    ws: WebSocket
    userId: string
    color: string
}

// A room is just the active set of connected clients for one playground.
export type Room = Set<RoomClient>

/**
 * Send a message to every client in the room except optionally one.
 */

// Sends one server message to everyone in a room, with optional sender exclusion.
function broadcast(
    room: Room,
    msg: ServerMessage,
    exclude?: RoomClient
) {
    const raw = JSON.stringify(msg)
    for (const client of room) {
        if (exclude && client === exclude) continue
        client.ws.send(raw)
    }
}

// Shares cursor updates so collaborators can render live carets/selections.
export function broadCastCursor(room: Room, from: RoomClient, range: CursorRange) {
    broadcast(room, {
        type: "cursor",
        userId: from.userId,
        range,
        color: from.color
    })
}

// Announces a newly joined user to all existing members (except the new user).
export function broadCastJoin(room: Room, user: User, joinedClient: RoomClient) {
    broadcast(room, {
        type: "join",
        user,
    },
        joinedClient
    )
}

// Announces that a user left the room.
export function broadcastLeave(room: Room, userId: string) {
    broadcast(room, {
        type: "leave",
        userId,
    })
}