/**
 * ===================================================================
 * PROPRIETARY CODE - BuildItUp Root Layout
 * Owner: Prajjwal Sahu (@Prajjwal2051)
 * GitHub: https://github.com/Prajjwal2051
 * 
 * Unauthorized copying or distribution is strictly prohibited.
 * © 2024-2025 Prajjwal Sahu. All rights reserved.
 * ===================================================================
 */

import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/auth'
import { ThemeProvider } from '@/components/theme-provider'
import { ProprietaryLayoutInitializer } from '@/components/proprietary-layout-initializer'

export const metadata: Metadata = {
    title: 'BuildItUp - AI Code Editor',
    description: 'Build, Learn, Deploy with AI-assisted code development. Proprietary code by Prajjwal Sahu (@Prajjwal2051).',
    authors: [
        {
            name: 'Prajjwal Sahu',
            url: 'https://github.com/Prajjwal2051',
        },
    ],
    keywords: ['proprietary', 'code', 'editor', 'ai', 'collaboration'],
}

async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    const session = await auth()
    return (
        <html lang="en" className="scroll-smooth" suppressHydrationWarning>
            <head>
                <meta name="copyright" content="© 2024-2025 Prajjwal Sahu. All rights reserved." />
                <meta name="author" content="Prajjwal Sahu (@Prajjwal2051)" />
                <meta name="proprietary" content="true" />
                <meta name="license" content="PROPRIETARY - Unauthorized use prohibited" />
            </head>
            <SessionProvider session={session}>
                <body className="antialiased" suppressHydrationWarning>
                    <ProprietaryLayoutInitializer />
                    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
                        {children}
                    </ThemeProvider>
                </body>
            </SessionProvider>
        </html>
    )
}

export default RootLayout
