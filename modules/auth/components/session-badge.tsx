'use client'

import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useCurrentUser } from '../hooks/use-current-user'

type SessionBadgeProps = {
    href?: string
    className?: string
    nameClassName?: string
    labelClassName?: string
    avatarSize?: 'default' | 'sm' | 'lg'
    showLabel?: boolean
}

function SessionBadge({
    href = '/dashboard',
    className = '',
    nameClassName = '',
    labelClassName = '',
    avatarSize = 'sm',
    showLabel = true,
}: SessionBadgeProps) {
    const user = useCurrentUser()

    if (!user) return null

    const displayName = user.name?.trim() || user.email?.split('@')[0] || 'Account'
    const fallback = displayName.charAt(0).toUpperCase()

    return (
        <Link
            href={href}
            className={`flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition-colors hover:border-[#00d4aa]/30 hover:bg-white/8 ${className}`}
        >
            <Avatar size={avatarSize}>
                <AvatarImage src={user.image ?? undefined} alt={displayName} />
                <AvatarFallback className="bg-[#163028] text-[11px] font-medium text-[#00d4aa]">
                    {fallback}
                </AvatarFallback>
            </Avatar>
            {showLabel ? (
                <div className="min-w-0 text-left">
                    <p className={`text-[12px] leading-4 text-neutral-500 ${labelClassName}`}>
                        Signed in as
                    </p>
                    <p className={`max-w-40 truncate text-[13px] font-medium text-white ${nameClassName}`}>
                        {displayName}
                    </p>
                </div>
            ) : null}
        </Link>
    )
}

export default SessionBadge
