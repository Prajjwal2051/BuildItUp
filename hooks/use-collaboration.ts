'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { editor as MonacoEditor } from 'monaco-editor'
import { useWebSocket } from '@/hooks/use-websocket'
import { usePresence } from '@/hooks/use-presence'
import type { CursorRange, ServerMessage, TextOperations } from '@/CollabServer/types'

interface UseCollaborationOptions {
    token: string
    userId?: string
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
    localUserId: string | null
}

// Composes websocket transport + presence synchronization and exposes editor-ready collaboration actions.
export function useCollaboration(options: UseCollaborationOptions): UseCollaborationResult {
    const {
        token,
        userId,
        editor,
        wsUrl,
        enabled = true,
        onServerOperation,
        onServerInit,
    } = options

    const revisionRef = useRef(0)
    const userLabelRef = useRef(new Map<string, string>())
    const localUserIdRef = useRef<string | null>(null)
    const [localUserId, setLocalUserId] = useState<string | null>(null)

    const { isConnected, sendMessage, subscribe } = useWebSocket<ServerMessage>({
        token,
        userId,
        wsUrl,
        enabled,
        resolveUserLabel: (targetUserId) => userLabelRef.current.get(targetUserId) ?? targetUserId,
        getCurrentUserId: () => localUserIdRef.current,
        onViewConflict: (message) => {
            if (typeof window === 'undefined') return
            window.dispatchEvent(new CustomEvent('collab-conflict-open', { detail: message }))
        },
    })

    useEffect(() => {
        return subscribe((message) => {
            if (message.type === 'init' || message.type === 'operation' || message.type === 'acknowledgment') {
                revisionRef.current = message.rev
            }

            if (message.type === 'init') {
                localUserIdRef.current = message.selfUserId
                setLocalUserId(message.selfUserId)
                onServerInit?.(message.content, message.rev)
            }

            if (message.type === 'operation') {
                onServerOperation?.(message.op, message.authorId, message.rev)
            }
        })
    }, [onServerInit, onServerOperation, subscribe])

    const sendCursor = useCallback(
        (cursor: CursorRange) => {
            return sendMessage({
                type: 'cursor',
                rev: revisionRef.current,
                cursor,
            })
        },
        [sendMessage],
    )

    const sendOp = useCallback(
        (op: TextOperations) => {
            return sendMessage({
                type: 'operation',
                rev: revisionRef.current,
                op,
            })
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
        localUserId,
    }
}
