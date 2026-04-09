'use client'
import { useState } from 'react'
import { X } from 'lucide-react'

export default function NotificationBanner() {
    const [visible, setVisible] = useState(true)
    if (!visible) return null

    return (
        <div className="w-full px-6 md:px-10 max-w-[1440px] mx-auto mt-3">
            <div
                className="rounded-xl flex items-center justify-between px-4 py-2.5 border relative overflow-hidden"
                style={{ backgroundColor: '#1a1b20', borderColor: '#2a2b32' }}
            >
                {/* Noise overlay */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.04]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'repeat',
                        backgroundSize: '128px 128px',
                    }}
                />
                <div className="flex items-center gap-4 text-[14px] text-neutral-400 relative z-10">
                    <span
                        className="px-3 py-1 rounded-[6px] font-bold text-[11px] tracking-wide uppercase"
                        style={{ backgroundColor: '#00d4aa', color: '#000' }}
                    >
                        New
                    </span>
                    Orbit Code v2.0 is live — real-time collab with OT engine and Ollama AI
                </div>
                <button
                    onClick={() => setVisible(false)}
                    className="text-neutral-500 hover:text-white transition-colors cursor-pointer relative z-10 ml-4 flex-shrink-0"
                    aria-label="Close banner"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
