'use client'

import React from 'react'
import { SidebarInset } from '@/components/ui/sidebar'
import { FileCode2, Users } from 'lucide-react'
import Link from 'next/link'

interface PlaygroundEditorProps {
    playgroundId: string
    collab?: { token: string }
}

export function PlaygroundEditor({ playgroundId, collab }: PlaygroundEditorProps) {
    // In a full implementation, you would fetch the playground data using the shared token
    // and initialize the WebContainer along with real-time collaboration (Yjs/WebSockets).
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
                                Collaborative Playground
                            </span>
                        </div>
                        {collab && (
                            <div className="flex items-center gap-1.5 rounded-full bg-[#00d4aa]/10 px-2.5 py-1 text-xs text-[#00d4aa] border border-[#00d4aa]/20">
                                <Users size={12} />
                                <span>Collab Active</span>
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
                            <Users size={24} />
                        </div>
                        <h2 className="mb-2 text-xl font-semibold text-white">
                            Collaborative Editing Session
                        </h2>
                        <p className="max-w-md text-sm text-[#8ea5b5]">
                            You are connected to a collaborative session (ID: {playgroundId}). In a
                            complete implementation, this page will run a Yjs-synced Monaco Editor
                            to allow multiple users to edit code in real time.
                        </p>
                    </div>
                </div>
            </SidebarInset>
        </div>
    )
}
