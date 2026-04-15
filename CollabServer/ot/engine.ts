// ─────────────────────────────────────────────────────────────────
// OT ENGINE
// Applies text operations and transforms stale operations for concurrent edits.
// ─────────────────────────────────────────────────────────────────

import { TextOperations } from "../types";

/**
 * Applies one operation to the current text and returns the next text.
 * We keep this separate so every edit path uses the same update rules.
 */

export function apply(content: string, op: TextOperations): string {
    // Route by operation type so each edit rule stays explicit and easy to test.
    switch (op.type) {
        case "insert": {
            const before = content.slice(0, op.position)
            const after = content.slice(op.position)
            return before + op.text + after
        }
        case "delete": {
            const before = content.slice(0, op.position)
            const after = content.slice(op.position + op.length)
            return before + after
        }
        case "retain": {
            // Retain does not change text content.
            return content
        }
    }
}

/**
 * Repositions `applied` as if `incoming` already happened first.
 * This prevents stale indexes when two users edit around the same region.
 */
export function transform(applied: TextOperations, incoming: TextOperations): TextOperations {
    if (incoming.type === "insert") {
        // When text is inserted first, later ops at or after that index move right.
        if (applied.type === "insert") {
            if (applied.position >= incoming.position) {
                return {
                    ...applied,
                    position: applied.position + incoming.text.length
                }
            }
            return applied
        }
        if (applied.type === "delete") {
            if (applied.position >= incoming.position) {
                return {
                    ...applied,
                    position: applied.position + incoming.text.length
                }
            }
            return applied
        }

        // Retain carries position context only, so no shift is needed here.
        return applied

    }

    if (incoming.type === "delete") {
        // Deleted ranges remove space, so later ops may shift left or clamp to range start.
        const inStart = incoming.position
        const inEnd = incoming.position + incoming.length

        if (applied.type === "insert") {
            // Insert after deleted region shifts left by the deleted length.
            if (applied.position > inEnd) {
                return {
                    ...applied,
                    position: applied.position - incoming.length
                }
            }
            // Insert inside deleted region clamps to the region start.
            if (applied.position >= inStart && applied.position <= inEnd) {
                return {
                    ...applied,
                    position: inStart
                }
            }
            return applied
        }

        if (applied.type === "delete") {
            const appStart = applied.position
            const appEnd = applied.position + applied.length

            // Delete after incoming delete also shifts left.
            if (appStart >= inEnd) {
                return {
                    ...applied,
                    position: applied.position - incoming.length
                }
            }

            // If applied delete is fully before incoming delete, ranges do not interact.
            if (appEnd <= inStart) {
                return applied
            }

            // For overlap, keep one merged start and trim the duplicate deleted portion.
            const newStart = Math.min(appStart, inStart)
            const overlap =
                Math.min(appEnd, inEnd) - Math.max(appStart, inStart)

            return {
                ...applied,
                position: newStart,
                length: applied.length - overlap,
            }
        }

        // retain unaffected
        return applied
    }

    // Incoming retain does not consume or add characters, so indexes stay the same.
    return applied


}

