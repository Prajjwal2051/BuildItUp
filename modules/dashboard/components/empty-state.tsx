'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

function EmptyState() {
    return (
        <div className="flex min-h-[50vh] w-full items-center justify-center">
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                whileHover={{ y: -6, scale: 1.01 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex max-w-lg flex-col items-center gap-3 rounded-[28px] border border-[#1e2028] bg-[linear-gradient(180deg,rgba(17,20,24,0.94),rgba(12,15,19,0.9))] px-10 py-12 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
            >
                <div className="rounded-2xl border border-[#00d4aa]/20 bg-[#00d4aa]/8 p-3">
                    <Sparkles className="h-5 w-5 text-[#00d4aa]" />
                </div>
                <h2 className="text-2xl font-semibold text-neutral-200">No playgrounds yet</h2>
                <p className="text-sm leading-6 text-neutral-500">
                    Create your first playground or import a GitHub repo to bring this workspace to
                    life.
                </p>
            </motion.div>
        </div>
    )
}

export default EmptyState
