import React from 'react'
import { MouseGlow } from '@/components/ui/mouse-glow'

// Wraps auth pages with the same dark visual language used on the landing page.
const AuthLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div
            className="relative min-h-screen overflow-hidden"
            style={{ backgroundColor: '#0a0d12' }}
        >
            <MouseGlow />
            <div
                className="fixed inset-0 pointer-events-none z-0"
                style={{
                    background: `
      radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,212,170,0.04) 0%, transparent 70%),
      radial-gradient(ellipse 100% 50% at 50% 100%, rgba(0,60,40,0.15) 0%, transparent 60%)
    `,
                }}
            />
            <div
                className="fixed inset-0 pointer-events-none z-0 bg-dot-pattern bg-dot-drift"
                style={{ opacity: 0.6 }}
            />
            <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
                {children}
            </div>
        </div>
    )
}

export default AuthLayout
