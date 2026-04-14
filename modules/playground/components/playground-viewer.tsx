'use client'

import React from 'react'
import { SidebarInset } from '@/components/ui/sidebar'
import { FileCode2, Lock } from 'lucide-react'
import Link from 'next/link'

interface PlaygroundViewerProps {
    playgroundId: string
    readOnly?: boolean
}

export function PlaygroundViewer({ playgroundId, readOnly = true }: PlaygroundViewerProps) {
    // In a full implementation, you would fetch the playground data using the shared token
    // or a dedicated API endpoint that doesn't check user ownership for shared links.
    // For now, this is a placeholder UI for the shared view.

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#0a0d12]">
            <SidebarInset className="relative flex flex-1 flex-col overflow-hidden text-white">
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-[#1e2028] bg-[#080e13] px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center gap-2 rounded-xl border border-[#1e2028] bg-[#11161d] px-3 py-1.5">
                            <FileCode2 size={16} className="text-[#00d4aa]" />
                            <span className="font-mono text-[13px] font-medium text-[#c9d4e5]">
                                Shared Playground
                            </span>
                        </div>
                        {readOnly && (
                            <div className="flex items-center gap-1.5 rounded-full bg-[#1e2028]/50 px-2.5 py-1 text-xs text-[#8ea5b5]">
                                <Lock size={12} />
                                <span>Read Only</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <Link
                            href="/dashboard"
                            className="rounded-md border border-[#1e2028] bg-[#11161d] px-3 py-1.5 text-xs text-[#8ea5b5] transition-colors hover:border-[#00d4aa]/30 hover:text-white"
                        >
                            Go to Dashboard
                        </Link>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex flex-1 items-center justify-center">
                    <div className="text-center">
                        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#11161d] text-[#00d4aa]">
                            <Lock size={24} />
                        </div>
                        <h2 className="mb-2 text-xl font-semibold text-white">
                            Shared View Active
                        </h2>
                        <p className="max-w-md text-sm text-[#8ea5b5]">
                            You are viewing a shared playground (ID: {playgroundId}). In a complete
                            implementation, this page will render the read-only editor and
                            WebContainer preview using a public access token.
                        </p>
                    </div>
                </div>
            </SidebarInset>
        </div>
    )
}
