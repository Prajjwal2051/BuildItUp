// ─────────────────────────────────────────────────────────────────
// OT SESSION STATE
// Stores per-playground in-memory state used by live OT processing.
// ─────────────────────────────────────────────────────────────────

import { TextOperations } from "../types"

export interface DocumentState {
    content: string,  // Current document content
    revision: number,  // Current document revision number
    operations: Array<{
        rev: number
        op: TextOperations
        authorId: string
        timestamp: number
        beforeContent: string
    }> // History of all operations applied to this document (for OT transformation)
}

const sessions = new Map<string, DocumentState>()  // here string -> playgroundId   document state-> above

// Lists active playground IDs currently present in in-memory session state.
export function listDocumentStates(): string[] {
    return Array.from(sessions.keys())
}

// Reads current document state for a playground, if present in memory.
export function getDocumentState(playgroundId: string): DocumentState | null {
    return sessions.get(playgroundId) ?? null
}

// Stores or replaces document state for a playground.
export function setDocumentState(playgroundId: string, state: DocumentState): void {
    sessions.set(playgroundId, state)
}

// Removes document state when a session ends.
export function deleteDocumentState(playgroundId: string): void {
    sessions.delete(playgroundId)
}

// Appends one applied op to memory history and keeps only the newest 500 entries.
export function appendOperation(
    playgroundId: string,
    entry: { rev: number; op: TextOperations; authorId: string; beforeContent: string }): void {

    // Skip safely if the room/session was already cleaned up.
    const state = sessions.get(playgroundId)
    if (!state) return

    state.operations.push({ ...entry, timestamp: Date.now() })

    // now only the last 500 operations (same as the redis ring buffer later)
    if (state.operations.length > 500) {
        state.operations = state.operations.slice(-500)
    }
}

