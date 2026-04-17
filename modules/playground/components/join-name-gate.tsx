'use client'

import React, { useState } from 'react'

interface JoinNameGateProps {
    onJoin: (name: string) => void
}

export function JoinNameGate({ onJoin }: JoinNameGateProps) {
    const [name, setName] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = name.trim()
        if (!trimmed) return
        onJoin(trimmed)
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#0c1017]">
            <form
                onSubmit={handleSubmit}
                className="flex w-[320px] flex-col gap-4 rounded-xl border border-[#1e2028] bg-[#11161d] p-6 shadow-xl"
            >
                <div>
                    <h2 className="text-sm font-semibold text-white">Join Collab Session</h2>
                    <p className="mt-1 text-xs text-[#8ea5b5]">
                        Enter your name so others can see who you are.
                    </p>
                </div>
                <input
                    autoFocus
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={32}
                    className="h-9 rounded-md border border-[#1e2028] bg-[#0f141b] px-3 text-sm text-white placeholder:text-[#6a7280] outline-none focus:border-[#00d4aa]/60"
                />
                <button
                    type="submit"
                    disabled={!name.trim()}
                    className="h-9 rounded-md border border-[#00d4aa]/50 bg-[rgba(0,212,170,0.1)] text-sm font-medium text-[#00d4aa] transition-colors hover:bg-[rgba(0,212,170,0.2)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Join Session
                </button>
            </form>
        </div>
    )
}