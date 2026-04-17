'use client'

import { useEffect, useState } from 'react'
import type { editor as MonacoEditor } from 'monaco-editor'
import type { CursorRange, ServerMessage, User } from '@/CollabServer/types'

interface UsePresenceOptions {
    editor: MonacoEditor.IStandaloneCodeEditor | null
    subscribe: (listener: (message: ServerMessage) => void) => () => void
    sendCursor: (cursor: CursorRange) => void
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
    const { editor, subscribe, sendCursor } = options
    const [users, setUsers] = useState<User[]>([])

    useEffect(() => {
        return subscribe((message) => {
            if (message.type === 'init') {
                setUsers(dedupeUsers(message.users))
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

    return { users }
}
