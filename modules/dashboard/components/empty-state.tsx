import React from 'react'

function EmptyState() {
    return (
        <div className="flex items-center justify-center h-screen w-full pl-64">
            <div className="flex flex-col items-center gap-2">
                <h2 className="text-2xl font-semibold text-neutral-300">No playgrounds yet</h2>
                <p className="text-sm text-neutral-500">Create your first playground to see it here.</p>
            </div>
        </div>
    )
}

export default EmptyState
