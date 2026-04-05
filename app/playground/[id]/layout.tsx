import { SidebarProvider } from '@/components/ui/sidebar'
import React from 'react'

function PlaygroundLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <div>
            <SidebarProvider>{children}</SidebarProvider>
        </div>
    )
}

export default PlaygroundLayout
