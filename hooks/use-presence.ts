'use client'

import { useEffect, useRef, useState } from 'react'
import type { editor as MonacoEditor } from 'monaco-editor'
import type { CursorRange, ServerMessage, User } from '@/CollabServer/types'
import { userColor } from '@/lib/user-color'

interface UsePresenceOptions {
    editor: MonacoEditor.IStandaloneCodeEditor | null
    subscribe: (listener: (message: ServerMessage) => void) => () => void
    sendCursor: (cursor: CursorRange) => void
    /** The local user's own display name, used to seed the self-entry on init */
    selfDisplayName?: string
}

function dedupeUsers(users: User[]): User[] {
    const byId = new Map<string, User>()
    for (const user of users) {
        byId.set(user.userId, user)
    }
    return Array.from(byId.values())
}

// Tracks presence state and syncs local Monaco cursor updates to the collaboration server.
export function usePresence(options: UsePresenceOptions) {
    const { editor, subscribe, sendCursor, selfDisplayName } = options
    const [users, setUsers] = useState<User[]>([])
    // Track selfUserId so we can update self-entry when displayName resolves later
    const selfUserIdRef = useRef<string | null>(null)
    // Use a ref so the subscribe closure always reads the latest selfDisplayName
    const selfDisplayNameRef = useRef(selfDisplayName)
    selfDisplayNameRef.current = selfDisplayName

    // If selfDisplayName resolves after init (e.g. session loads async), sync the self entry
    useEffect(() => {
        if (!selfDisplayName || !selfUserIdRef.current) return
        setUsers((current) =>
            current.map((user) =>
                user.userId === selfUserIdRef.current
                    ? { ...user, displayName: selfDisplayName }
                    : user,
            ),
        )
    }, [selfDisplayName])

    useEffect(() => {
        return subscribe((message) => {
            if (message.type === 'init') {
                selfUserIdRef.current = message.selfUserId
                // Build a self-entry so the owner appears in their own presence bar.
                const selfUser: User = {
                    userId: message.selfUserId,
                    displayName: selfDisplayNameRef.current ?? message.selfUserId,
                    color: userColor(message.selfUserId),
                    cursor: null,
                    isActive: true,
                }
                setUsers(dedupeUsers([selfUser, ...message.users]))
                return
            }

            if (message.type === 'join') {
                setUsers((current) => {
                    const existing = current.find((user) => user.userId === message.user.userId)
                    if (existing) {
                        return dedupeUsers(current.map((user) =>
                            user.userId === message.user.userId
                                ? { ...message.user, isActive: true }
                                : user,
                        ))
                    }
                    return dedupeUsers([...current, { ...message.user, isActive: true }])
                })
                return
            }

            if (message.type === 'leave') {
                setUsers((current) => current.filter((user) => user.userId !== message.userId))
                return
            }

            if (message.type === 'cursor') {
                setUsers((current) =>
                    current.map((user) =>
                        user.userId === message.userId
                            ? {
                                ...user,
                                color: message.color,
                                cursor: message.range,
                                isActive: true,
                            }
                            : user,
                    ),
                )
                return
            }

            if (message.type === 'user_update') {
                setUsers((current) =>
                    dedupeUsers(
                        current.map((user) =>
                            user.userId === message.user.userId
                                ? { ...user, ...message.user, isActive: true }
                                : user,
                        ),
                    ),
                )
            }
        })
    }, [subscribe])

    useEffect(() => {
        if (!editor) return

        let timer: ReturnType<typeof setTimeout> | null = null
        const disposable = editor.onDidChangeCursorSelection((event) => {
            if (timer) clearTimeout(timer)
            timer = setTimeout(() => {
                const selection = event.selection
                const cursor: CursorRange = {
                    startLine: selection.startLineNumber,
                    startCol: selection.startColumn,
                    endLine: selection.endLineNumber,
                    endColumn: selection.endColumn,
                }
                sendCursor(cursor)
            }, 80)
        })

        return () => {
            if (timer) clearTimeout(timer)
            disposable.dispose()
        }
    }, [editor, sendCursor])

    const updateSelfDisplayName = (userId: string, newName: string) => {
        setUsers((current) =>
            current.map((user) =>
                user.userId === userId ? { ...user, displayName: newName } : user,
            ),
        )
    }

    return { users, updateSelfDisplayName }
}
