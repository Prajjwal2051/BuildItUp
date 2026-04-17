'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { ServerMessage } from '@/CollabServer/types'

type JsonValue = Record<string, unknown>

interface UseWebSocketOptions {
    token: string
    userId?: string
    displayName?: string
    enabled?: boolean
    wsUrl?: string
    resolveUserLabel?: (userId: string) => string
    getCurrentUserId?: () => string | null
    onViewConflict?: (message: Extract<ServerMessage, { type: 'conflict' }>) => void
}

type MessageListener<T> = (message: T) => void

interface UseWebSocketResult<TIncoming> {
    isConnected: boolean
    sendMessage: (message: JsonValue) => boolean
    subscribe: (listener: MessageListener<TIncoming>) => () => void
}

function normalizeWsUrl(rawUrl: string | undefined): string | null {
    if (!rawUrl) return null

    const trimmed = rawUrl.trim()
    if (!trimmed) return null

    if (trimmed.startsWith('ws://') || trimmed.startsWith('wss://')) {
        return trimmed
    }

    if (trimmed.startsWith('http://')) {
        return `ws://${trimmed.slice('http://'.length)}`
    }

    if (trimmed.startsWith('https://')) {
        return `wss://${trimmed.slice('https://'.length)}`
    }

    return null
}

// Creates a browser WebSocket client with auth-on-open and retry backoff.
export function useWebSocket<TIncoming = unknown>(
    options: UseWebSocketOptions,
): UseWebSocketResult<TIncoming> {
    const {
        token,
        userId,
        displayName,
        enabled = true,
        wsUrl,
        resolveUserLabel,
        getCurrentUserId,
        onViewConflict,
    } = options

    const socketRef = useRef<WebSocket | null>(null)
    const shouldReconnectRef = useRef(true)
    const reconnectAttemptRef = useRef(0)
    const reconnectTimerRef = useRef<number | null>(null)
    const listenersRef = useRef(new Set<MessageListener<TIncoming>>())
    const candidateUrlsRef = useRef<string[]>([])
    const activeUrlIndexRef = useRef(0)
    const resolveUserLabelRef = useRef(resolveUserLabel)
    const getCurrentUserIdRef = useRef(getCurrentUserId)
    const onViewConflictRef = useRef(onViewConflict)
    const displayNameRef = useRef(displayName)

    const [isConnected, setIsConnected] = useState(false)

    const subscribe = useCallback((listener: MessageListener<TIncoming>) => {
        listenersRef.current.add(listener)
        return () => {
            listenersRef.current.delete(listener)
        }
    }, [])

    const notifyListeners = useCallback((message: TIncoming) => {
        for (const listener of listenersRef.current) {
            listener(message)
        }
    }, [])

    const sendMessage = useCallback((message: JsonValue) => {
        const socket = socketRef.current
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            return false
        }
        socket.send(JSON.stringify(message))
        return true
    }, [])

    useEffect(() => {
        resolveUserLabelRef.current = resolveUserLabel
    }, [resolveUserLabel])

    useEffect(() => {
        getCurrentUserIdRef.current = getCurrentUserId
    }, [getCurrentUserId])

    useEffect(() => {
        onViewConflictRef.current = onViewConflict
    }, [onViewConflict])

    useEffect(() => {
        displayNameRef.current = displayName
    }, [displayName])

    useEffect(() => {
        if (!enabled || !token || typeof window === 'undefined') {
            return
        }

        shouldReconnectRef.current = true

        const resolveCandidateUrls = () => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
            const pageHostname = window.location.hostname
            const explicitUrl = normalizeWsUrl(wsUrl ?? process.env.NEXT_PUBLIC_COLLAB_WS_URL)

            const candidates = [
                explicitUrl,
                `${protocol}//${pageHostname}:4001`,
                `${protocol}//localhost:4001`,
                `${protocol}//127.0.0.1:4001`,
            ].filter((value): value is string => Boolean(value))

            return Array.from(new Set(candidates))
        }

        const connect = () => {
            const candidates = candidateUrlsRef.current
            const resolvedUrl = candidates[activeUrlIndexRef.current] ?? candidates[0]
            if (!resolvedUrl) return

            const socket = new WebSocket(resolvedUrl)
            socketRef.current = socket

            socket.onopen = () => {
                reconnectAttemptRef.current = 0
                setIsConnected(true)
                socket.send(
                    JSON.stringify({
                        type: 'auth',
                        token,
                        userId,
                        displayName: displayNameRef.current,
                    }),
                )
            }

            socket.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(String(event.data)) as TIncoming
                    if (
                        parsed &&
                        typeof parsed === 'object' &&
                        'type' in parsed &&
                        (parsed as ServerMessage).type === 'conflict'
                    ) {
                        const conflict = parsed as unknown as Extract<ServerMessage, { type: 'conflict' }>
                        const currentUserId = getCurrentUserIdRef.current?.() ?? userId ?? null
                        const otherUserId = conflict.authorAId === currentUserId ? conflict.authorBId : conflict.authorAId
                        const otherLabel = resolveUserLabelRef.current?.(otherUserId) ?? otherUserId

                        toast(`⚡ You and ${otherLabel} edited the same region`, {
                            action: {
                                label: 'View diff',
                                onClick: () => {
                                    onViewConflictRef.current?.(conflict)
                                },
                            },
                        })
                    }
                    notifyListeners(parsed)
                } catch {
                    // Ignore non-JSON payloads so one bad frame does not kill the connection.
                }
            }

            socket.onclose = () => {
                setIsConnected(false)
                if (!shouldReconnectRef.current) return

                // Rotate through known URLs to recover from stale env port values.
                if (candidateUrlsRef.current.length > 1) {
                    activeUrlIndexRef.current =
                        (activeUrlIndexRef.current + 1) % candidateUrlsRef.current.length
                }

                const attempt = reconnectAttemptRef.current
                const delay = Math.min(1000 * Math.pow(2, attempt), 8000)
                reconnectAttemptRef.current = attempt + 1

                reconnectTimerRef.current = window.setTimeout(connect, delay)
            }

            socket.onerror = () => {
                // Let onclose drive reconnection behavior.
            }
        }

        candidateUrlsRef.current = resolveCandidateUrls()
        activeUrlIndexRef.current = 0
        connect()

        return () => {
            shouldReconnectRef.current = false
            setIsConnected(false)

            if (reconnectTimerRef.current !== null) {
                window.clearTimeout(reconnectTimerRef.current)
            }

            const socket = socketRef.current
            socketRef.current = null
            candidateUrlsRef.current = []
            activeUrlIndexRef.current = 0
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.close()
            }
        }
    }, [enabled, notifyListeners, token, userId, wsUrl])

    return {
        isConnected,
        sendMessage,
        subscribe,
    }
}