'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { ServerMessage } from '@/CollabServer/types'

type JsonValue = Record<string, unknown>

interface UseWebSocketOptions {
    token: string
    userId?: string
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

// Creates a browser WebSocket client with auth-on-open and retry backoff.
export function useWebSocket<TIncoming = unknown>(
    options: UseWebSocketOptions,
): UseWebSocketResult<TIncoming> {
    const {
        token,
        userId,
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
        if (!enabled || !token || typeof window === 'undefined') {
            return
        }

        shouldReconnectRef.current = true

        const resolveUrl = () => {
            if (wsUrl) return wsUrl
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
            const host = window.location.host
            return `${protocol}//${host}`
        }

        const connect = () => {
            const socket = new WebSocket(resolveUrl())
            socketRef.current = socket

            socket.onopen = () => {
                reconnectAttemptRef.current = 0
                setIsConnected(true)
                socket.send(
                    JSON.stringify({
                        type: 'auth',
                        token,
                        userId,
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
                        const currentUserId = getCurrentUserId?.() ?? userId ?? null
                        const otherUserId = conflict.authorAId === currentUserId ? conflict.authorBId : conflict.authorAId
                        const otherLabel = resolveUserLabel?.(otherUserId) ?? otherUserId

                        toast(`⚡ You and ${otherLabel} edited the same region`, {
                            action: {
                                label: 'View diff',
                                onClick: () => {
                                    onViewConflict?.(conflict)
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

                const attempt = reconnectAttemptRef.current
                const delay = Math.min(1000 * Math.pow(2, attempt), 8000)
                reconnectAttemptRef.current = attempt + 1

                reconnectTimerRef.current = window.setTimeout(connect, delay)
            }

            socket.onerror = () => {
                // Let onclose drive reconnection behavior.
            }
        }

        connect()

        return () => {
            shouldReconnectRef.current = false
            setIsConnected(false)

            if (reconnectTimerRef.current !== null) {
                window.clearTimeout(reconnectTimerRef.current)
            }

            const socket = socketRef.current
            socketRef.current = null
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.close()
            }
        }
    }, [enabled, notifyListeners, onViewConflict, resolveUserLabel, token, userId, wsUrl])

    return {
        isConnected,
        sendMessage,
        subscribe,
    }
}