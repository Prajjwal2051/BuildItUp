'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { User } from '@/CollabServer/types'

interface PresenceAvatarsProps {
    users: User[]
    localUserId: string | null
    maxVisible?: number
}

function getInitials(name: string): string {
    const trimmed = name.trim()
    if (!trimmed) return 'U'
    const words = trimmed.split(/\s+/)
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
    return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

function prettyDisplayName(name: string): string {
    if (!name) return 'Anonymous'
    // Only anonymise pure random IDs (guest-xxxxxxxx), not real display names
    if (/^guest-[a-z0-9]{6,}$/.test(name)) return 'Anonymous'
    return name
}

interface AvatarProps {
    user: User
    isSelf: boolean
    isTyping: boolean
}

function Avatar({ user, isSelf, isTyping }: AvatarProps) {
    const [showTooltip, setShowTooltip] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleMouseEnter = useCallback(() => {
        timerRef.current = setTimeout(() => setShowTooltip(true), 120)
    }, [])

    const handleMouseLeave = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current)
        setShowTooltip(false)
    }, [])

    useEffect(() => () => {
        if (timerRef.current) clearTimeout(timerRef.current)
    }, [])

    const color = user.color
    const bg = `${color}1a`
    const border = isSelf ? '#ffffff' : color
    const ring = `${color}55`

    return (
        <div
            className="relative shrink-0"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Pulse ring when typing */}
            {isTyping && (
                <span
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ boxShadow: `0 0 0 2px ${ring}`, opacity: 0.6 }}
                />
            )}

            {/* Avatar circle */}
            <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold select-none cursor-default transition-transform hover:scale-110"
                style={{
                    border: `2px solid ${border}`,
                    color: color,
                    backgroundColor: bg,
                }}
            >
                {user.avatar ? (
                    <img
                        src={user.avatar}
                        alt={prettyDisplayName(user.displayName || user.userId)}
                        className="h-full w-full rounded-full object-cover"
                    />
                ) : (
                    getInitials(prettyDisplayName(user.displayName || user.userId))
                )}
            </div>

            {/* Tooltip */}
            {showTooltip && (
                <div
                    className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-[#1e2028] bg-[#11161d] px-2.5 py-2.5 shadow-lg"
                    style={{ pointerEvents: 'none' }}
                >
                    <p className="text-[11px] font-medium text-white">
                        {isSelf
                            ? `You${user.displayName ? ` (${user.displayName})` : ''}`
                            : prettyDisplayName(user.displayName || user.userId)}
                    </p>
                    <p className="text-[10px] text-[#8ea5b5]">
                        {isTyping ? 'Typing…' : user.isActive ? 'Active' : 'Idle'}
                    </p>
                    {/* Tooltip arrow */}
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-[#1e2028]" />
                </div>
            )}
        </div>
    )
}

export function PresenceAvatars({ users, localUserId, maxVisible = 4 }: PresenceAvatarsProps) {
    // Track which users moved their cursor recently (typing indicator)
    const [typingSet, setTypingSet] = useState<Set<string>>(new Set())
    const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

    // Mark a user as typing for 2s when their cursor changes
    useEffect(() => {
        const cursorUserIds = users.filter((u) => u.cursor).map((u) => u.userId)
        for (const uid of cursorUserIds) {
            const existing = typingTimers.current.get(uid)
            if (existing) clearTimeout(existing)
            setTypingSet((prev) => new Set([...prev, uid]))
            const timer = setTimeout(() => {
                setTypingSet((prev) => {
                    const next = new Set(prev)
                    next.delete(uid)
                    return next
                })
                typingTimers.current.delete(uid)
            }, 2000)
            typingTimers.current.set(uid, timer)
        }
    }, [users])

    // Clean up timers on unmount
    useEffect(() => () => {
        for (const t of typingTimers.current.values()) clearTimeout(t)
    }, [])

    if (users.length === 0) return null

    const visible = users.slice(0, maxVisible)
    const overflow = users.length - maxVisible

    return (
        <div className="flex items-center" style={{ gap: '-4px' }}>
            <div className="flex items-center" style={{ gap: '4px' }}>
                {visible.map((user) => (
                    <Avatar
                        key={user.userId}
                        user={user}
                        isSelf={user.userId === localUserId}
                        isTyping={typingSet.has(user.userId)}
                    />
                ))}
            </div>

            {overflow > 0 && (
                <div className="ml-1 flex h-7 items-center justify-center rounded-full border border-[#1e2028] bg-[#11161d] px-2 text-[10px] font-medium text-[#8ea5b5]">
                    +{overflow}
                </div>
            )}
        </div>
    )
}
