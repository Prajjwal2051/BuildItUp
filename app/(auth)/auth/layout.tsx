import React from 'react'

// Wraps auth pages with the same dark visual language used on the landing page.
const AuthLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div
            className="relative min-h-screen overflow-hidden"
            style={{ backgroundColor: '#0f0f0f' }}
        >
            <div
                className="fixed inset-0 pointer-events-none z-0 bg-dot-pattern"
                style={{ opacity: 0.6 }}
            />
            <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
                {children}
            </div>
        </div>
    )
}

export default AuthLayout
