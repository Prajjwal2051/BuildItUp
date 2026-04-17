'use client'

import { useCallback, useRef } from 'react'
import { transform } from '@/CollabServer/ot/engine'
import type { ServerMessage, TextOperations } from '@/CollabServer/types'

interface UseOTClientOptions {
    sendMessage: (message: Record<string, unknown>) => boolean
    onApplyRemoteOperation: (op: TextOperations, authorId: string, rev: number) => void
    onServerInit: (content: string, rev: number) => void
}

interface UseOTClientResult {
    getRevision: () => number
    sendLocalOperation: (op: TextOperations) => boolean
    handleServerMessage: (message: ServerMessage) => void
}

// Tracks local pending operations and rebases them against incoming remote edits.
export function useOTClient(options: UseOTClientOptions): UseOTClientResult {
    const { sendMessage, onApplyRemoteOperation, onServerInit } = options

    const revisionRef = useRef(0)
    const pendingRef = useRef<TextOperations[]>([])
    const queuedRef = useRef<TextOperations[]>([])

    const flushQueue = useCallback(() => {
        if (pendingRef.current.length > 0) return

        const next = queuedRef.current[0]
        if (!next) return

        const sent = sendMessage({
            type: 'operation',
            rev: revisionRef.current,
            op: next,
        })

        if (!sent) return

        queuedRef.current.shift()
        pendingRef.current.push(next)
    }, [sendMessage])

    const sendLocalOperation = useCallback(
        (op: TextOperations) => {
            if (pendingRef.current.length === 0) {
                const sent = sendMessage({
                    type: 'operation',
                    rev: revisionRef.current,
                    op,
                })

                if (sent) {
                    pendingRef.current.push(op)
                    return true
                }
            }

            queuedRef.current.push(op)
            return false
        },
        [sendMessage],
    )

    const handleServerMessage = useCallback(
        (message: ServerMessage) => {
            if (message.type === 'init') {
                const outstanding = [...pendingRef.current, ...queuedRef.current]
                pendingRef.current = []
                queuedRef.current = []
                revisionRef.current = message.rev

                onServerInit(message.content, message.rev)

                // Replay local unsynced edits on top of the fresh server snapshot.
                for (const op of outstanding) {
                    onApplyRemoteOperation(op, message.selfUserId, revisionRef.current)
                    queuedRef.current.push(op)
                }

                flushQueue()
                return
            }

            if (message.type === 'acknowledgment') {
                revisionRef.current = message.rev
                if (pendingRef.current.length > 0) {
                    pendingRef.current.shift()
                }
                flushQueue()
                return
            }

            if (message.type === 'operation') {
                revisionRef.current = message.rev

                // Rebase both waiting and buffered local edits over the incoming op.
                pendingRef.current = pendingRef.current.map((localOp) => transform(localOp, message.op))
                queuedRef.current = queuedRef.current.map((localOp) => transform(localOp, message.op))

                onApplyRemoteOperation(message.op, message.authorId, message.rev)
                return
            }
        },
        [flushQueue, onApplyRemoteOperation, onServerInit],
    )

    return {
        getRevision: () => revisionRef.current,
        sendLocalOperation,
        handleServerMessage,
    }
}