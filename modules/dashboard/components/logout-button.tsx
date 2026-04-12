'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type DashboardLogoutButtonProps = {
    className?: string
}

export function DashboardLogoutButton({ className }: DashboardLogoutButtonProps) {
    const router = useRouter()

    const handleLogout = async () => {
        await signOut({ callbackUrl: '/auth/sign-in' })
        router.push('/auth/sign-in')
    }

    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className={cn(
                'fixed right-6 bottom-6 z-50 gap-2 border-border/60 bg-background/90 text-foreground shadow-lg backdrop-blur-md hover:bg-background',
                className,
            )}
        >
            <LogOut className="h-4 w-4" />
            Logout
        </Button>
    )
}

export default DashboardLogoutButton
