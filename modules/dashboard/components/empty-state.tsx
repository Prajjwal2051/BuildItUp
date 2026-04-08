import React from 'react'

function EmptyState() {
    return (
        <div className="flex h-screen w-full items-center justify-center pl-64">
            <div className="flex flex-col items-center gap-2 rounded-3xl border border-[#1e2028] bg-[rgba(17,20,24,0.85)] px-10 py-12 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
                <h2 className="text-2xl font-semibold text-neutral-200">No playgrounds yet</h2>
                <p className="text-sm text-neutral-500">
                    Create your first playground to see it here.
                </p>
            </div>
        </div>
    )
}

export default EmptyState
