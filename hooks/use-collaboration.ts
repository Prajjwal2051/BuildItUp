'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { editor as MonacoEditor } from 'monaco-editor'
import { useWebSocket } from '@/hooks/use-websocket'
import { usePresence } from '@/hooks/use-presence'
import { useOTClient } from '@/hooks/use-ot-client'
import type { CursorRange, ServerMessage, TextOperations } from '@/CollabServer/types'

interface UseCollaborationOptions {
    token: string
    userId?: string
    displayName?: string
    editor: MonacoEditor.IStandaloneCodeEditor | null
    wsUrl?: string
    enabled?: boolean
    onServerOperation?: (op: TextOperations, authorId: string, rev: number) => void
    onServerInit?: (content: string, rev: number) => void
}

interface UseCollaborationResult {
    users: Array<{
        userId: string
        displayName: string
        avatar?: string
        color: string
        cursor: CursorRange | null
        isActive: boolean
    }>
    isConnected: boolean
    sendOp: (op: TextOperations) => boolean
    sendCursor: (cursor: CursorRange) => boolean
    updateDisplayName: (name: string) => boolean
    localUserId: string | null
}

// Composes websocket transport + presence synchronization and exposes editor-ready collaboration actions.
export function useCollaboration(options: UseCollaborationOptions): UseCollaborationResult {
    const {
        token,
        userId,
        displayName,
        editor,
        wsUrl,
        enabled = true,
        onServerOperation,
        onServerInit,
    } = options

    const userLabelRef = useRef(new Map<string, string>())
    const localUserIdRef = useRef<string | null>(null)
    const [localUserId, setLocalUserId] = useState<string | null>(null)
    const [stableGuestId] = useState(() => {
        if (typeof window === 'undefined') return `guest-${Math.random().toString(36).slice(2, 10)}`
        const key = 'builditup-collab-client-id'
        const existing = window.localStorage.getItem(key)
        if (existing) return existing
        const generated = `guest-${Math.random().toString(36).slice(2, 10)}`
        window.localStorage.setItem(key, generated)
        return generated
    })

    const resolvedAuthUserId = userId ?? stableGuestId

    const { isConnected, sendMessage, subscribe } = useWebSocket<ServerMessage>({
        token,
        userId: resolvedAuthUserId,
        displayName,
        wsUrl,
        enabled,
        resolveUserLabel: (targetUserId) => userLabelRef.current.get(targetUserId) ?? targetUserId,
        getCurrentUserId: () => localUserIdRef.current,
        onViewConflict: (message) => {
            if (typeof window === 'undefined') return
            window.dispatchEvent(new CustomEvent('collab-conflict-open', { detail: message }))
        },
    })

    const { getRevision, handleServerMessage, sendLocalOperation } = useOTClient({
        sendMessage,
        onApplyRemoteOperation: (op, authorId, rev) => onServerOperation?.(op, authorId, rev),
        onServerInit: (content, rev) => onServerInit?.(content, rev),
    })

    useEffect(() => {
        return subscribe((message) => {
            handleServerMessage(message)

            if (message.type === 'init') {
                localUserIdRef.current = message.selfUserId
                setLocalUserId(message.selfUserId)
            }
        })
    }, [handleServerMessage, subscribe])

    const sendCursor = useCallback(
        (cursor: CursorRange) => {
            return sendMessage({
                type: 'cursor',
                rev: getRevision(),
                cursor,
            })
        },
        [getRevision, sendMessage],
    )

    const sendOp = useCallback(
        (op: TextOperations) => {
            return sendLocalOperation(op)
        },
        [sendLocalOperation],
    )

    const updateDisplayName = useCallback(
        (name: string) => {
            const trimmed = name.trim()
            if (!trimmed) return false
            return sendMessage({ type: 'set_name', displayName: trimmed })
        },
        [sendMessage],
    )

    const { users } = usePresence({
        editor,
        subscribe,
        sendCursor,
    })

    useEffect(() => {
        const nextLabels = new Map<string, string>()
        for (const user of users) {
            nextLabels.set(user.userId, user.displayName)
        }
        userLabelRef.current = nextLabels
    }, [users])

    return {
        users,
        isConnected,
        sendOp,
        sendCursor,
        updateDisplayName,
        localUserId,
    }
}
