// ─────────────────────────────────────────────────────────────────
// SHARED TYPE DEFINITIONS
// All types and interfaces used across the real-time collaboration system
// ─────────────────────────────────────────────────────────────────

// TextOperations: Represents a single text edit operation for Operational Transformation.
// Used to apply or broadcast text changes to the document.
export type TextOperations =

    | { type: "insert"; position: number; text: string }  // Add text at position

    | { type: "delete"; position: number; length: number }  // Remove text starting at position

    | { type: "retain"; length: number }  // Skip over unchanged content (for OT transformation)


// CursorRange: Tracks a user's cursor position or selection in the editor.
// If startLine===endLine and startCol===endCol, it's just a cursor (no selection).
// Otherwise represents a range of selected text.
export interface CursorRange {
    startLine: number,
    startCol: number,
    endLine: number,
    endColumn: number,
    filePath?: string
}

// User: Represents a connected user's presence data.
// Includes their identity, visual representation (cursor, color), and current activity state.
// OTHER CLIENT MESSAGES
// Everything the collab server knows about
// a connected user that other users need to see
// ─────────────────────────────────────────

export interface User {
    userId: string,  // Unique identifier for the user
    displayName: string,  // Display name shown in the editor
    avatar?: string,  // Optional avatar URL
    color: string,  // Color for rendering user's cursor and selections
    cursor: CursorRange | null,  // Current cursor position or selection range
    isActive: boolean  // Whether user is currently active in the document
}


// ─────────────────────────────────────────
// CLIENT → SERVER MESSAGES
// Everything the browser can send to the collab server
// ─────────────────────────────────────────  

export type ClientMessage =
    | {
        type: "auth",
        token: string,   // Share link token for document access
        userId?: string, // Optional userId for reconnecting existing sessions
        displayName?: string, // Optional human-friendly name shown to collaborators
    }
    // Authenticate: First message after WS connects. Server validates token, joins room, sends "init".

    | {
        type: "operation",
        rev: number,  // Document revision this operation is based on (for OT conflict resolution)
        op: TextOperations  // Text operation to apply (insert, delete, or retain)
    }
    // Send when user types/edits. Server transforms against concurrent ops and broadcasts.

    | {
        type: "cursor",
        rev: number,  // Document revision for this cursor update
        cursor: CursorRange  // New cursor position or selection range
    }
    // Send when user moves cursor or changes selection. Helps others see "live" cursor positions.

    | {
        type: "ping"
    }

    | {
        type: "set_name"
        displayName: string
    }
// Keep-alive: Sent periodically to maintain connection and measure latency.

// ─────────────────────────────────────────
// SERVER → CLIENT MESSAGES
// Everything the collab server can send to a browser
// ─────────────────────────────────────────

export type ServerMessage =
    | {
        type: "init"
        rev: number           // Current document revision (e.g. 42)
        content: string       // Full document text at that revision
        fileTree?: unknown | null // Optional file tree structure for the playground
        users: User[]         // Other users currently in the room
        selfUserId: string    // User ID assigned to this client
    }
    // Initialize: Sent once after "auth" succeeds. Client loads editor with this content.

    | {
        type: "operation"
        rev: number           // New revision after this operation was applied
        op: TextOperations    // Transformed operation (safe to apply directly)
        authorId: string      // User ID of who made this change
    }
    // Operation broadcast: Sent to OTHER clients when someone edits.
    // Op is already transformed by server, so clients apply it directly.

    | {
        type: "acknowledgment"
        rev: number  // New revision after YOUR operation was applied
    }
    // Acknowledgment: Sent only to the client who sent the operation.
    // Indicates the operation was accepted and applied at this revision.

    | {
        type: "cursor"
        userId: string        // Which user's cursor moved
        range: CursorRange    // New cursor/selection position
        color: string         // Color to render this cursor
    }
    // Cursor update: Broadcast to all others when someone moves their cursor.

    | {
        type: "join"
        user: User  // Presence info of the new user
    }
    // User joined: Sent to all existing room members when a new user connects.

    | {
        type: "leave"
        userId: string  // User ID of who disconnected
    }
    // User left: Sent to all remaining members when someone disconnects.

    | {
        type: "user_update"
        user: User
    }
    // User updated: Sent when collaborator updates their display name.

    | {
        type: "error"
        code: string    // Error code (e.g. "TOKEN_INVALID", "TOKEN_EXPIRED", "FORBIDDEN")
        message: string // Human-readable error message
    }
    // Error: Sent when something fails (bad token, revoked link, etc.).

    | {
        type: "conflict"
        authorAId: string   // First author involved in the overlap
        authorBId: string   // Second author involved in the overlap
        opA: TextOperations // First operation that touched the region
        opB: TextOperations // Second operation that touched the region
        baseContent: string  // Shared base content both ops were compared against
        contentA: string     // Result after applying opA to baseContent
        contentB: string     // Result after applying opB to baseContent
    }
    // Conflict: Sent to both clients when overlapping edits land close together in time.

    | { type: "pong" }
// Keep-alive reply: Response to client's "ping" message.



