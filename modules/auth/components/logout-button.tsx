'use client'

import React from 'react'
import { LogoutButtonProps } from '../types'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

const LogoutButton = ({ children, className }: LogoutButtonProps) => {
    const router = useRouter()
    const onLogout = async () => {
        await signOut({ callbackUrl: '/auth/sign-in' })
        router.push('/auth/sign-in')
    }

    if (React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<{ onClick?: React.MouseEventHandler }>, {
            onClick: onLogout,
        })
    }

    return (
        <button type="button" className={cn('cursor-pointer', className)} onClick={onLogout}>
            {children ?? 'Logout'}
        </button>
    )
}

export default LogoutButton
