import { SidebarProvider } from "@/components/ui/sidebar";
import React from 'react'

export default function PlaygroundLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div>
            <SidebarProvider>
                {children}
            </SidebarProvider>
        </div>
    )
}

