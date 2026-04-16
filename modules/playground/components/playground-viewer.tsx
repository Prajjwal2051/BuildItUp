'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react'
import { SidebarInset } from '@/components/ui/sidebar'
import { FileCode2, Lock, Loader2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { configureMonaco, defaultEditorOptions, getEditorLanguage } from '@/modules/playground/lib/editor-config'

interface PlaygroundViewerProps {
    playgroundId: string
    token: string
    readOnly?: boolean
}

interface ContentResponse {
    playgroundId: string
    name?: string
    content: unknown
    revision: number
    source: 'redis' | 'db'
}

function extractText(content: unknown): string {
    if (typeof content === 'string') return content
    if (content && typeof content === 'object') {
        // Try common shapes: { code }, { text }, { content }, first string value
        const obj = content as Record<string, unknown>
        if (typeof obj.code === 'string') return obj.code
        if (typeof obj.text === 'string') return obj.text
        if (typeof obj.content === 'string') return obj.content
        // Serialise as pretty JSON so at least something is shown
        return JSON.stringify(content, null, 2)
    }
    return ''
}

function detectLanguage(content: unknown): string {
    if (content && typeof content === 'object') {
        const obj = content as Record<string, unknown>
        if (typeof obj.language === 'string') return obj.language
        if (typeof obj.extension === 'string') return getEditorLanguage(obj.extension)
        if (typeof obj.filename === 'string') {
            const ext = obj.filename.split('.').pop() ?? ''
            return getEditorLanguage(ext)
        }
    }
    return 'typescript'
}

export function PlaygroundViewer({ playgroundId, token, readOnly = true }: PlaygroundViewerProps) {
    const [code, setCode] = useState<string>('')
    const [language, setLanguage] = useState<string>('typescript')
    const [playgroundName, setPlaygroundName] = useState<string>('Shared Playground')
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
    const [errorMsg, setErrorMsg] = useState<string>('')
    const monacoRef = useRef<Monaco | null>(null)

    useEffect(() => {
        let cancelled = false

        async function fetchContent() {
            setStatus('loading')
            try {
                const res = await fetch(`/api/share/${token}/content`, { cache: 'no-store' })
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}))
                    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
                }
                const data: ContentResponse = await res.json()
                if (cancelled) return

                const text = extractText(data.content)
                const lang = detectLanguage(data.content)
                setCode(text)
                setLanguage(lang)
                if (data.name) setPlaygroundName(data.name)
                setStatus('ready')
            } catch (err) {
                if (cancelled) return
                setErrorMsg(err instanceof Error ? err.message : 'Failed to load')
                setStatus('error')
            }
        }

        void fetchContent()
        return () => { cancelled = true }
    }, [token])

    const handleEditorMount: OnMount = useCallback((_, monaco) => {
        monacoRef.current = monaco
        configureMonaco(monaco)
    }, [])

    const readOnlyOptions = {
        ...defaultEditorOptions,
        readOnly: true,
        readOnlyMessage: { value: 'This playground is shared in view-only mode.' },
        domReadOnly: true,
        cursorBlinking: 'solid' as const,
        renderLineHighlight: 'none' as const,
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#0a0d12]">
            <SidebarInset className="relative flex flex-1 flex-col overflow-hidden text-white">
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-[#1e2028] bg-[#080e13] px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center gap-2 rounded-xl border border-[#1e2028] bg-[#11161d] px-3 py-1.5">
                            <FileCode2 size={16} className="text-[#00d4aa]" />
                            <span className="font-mono text-[13px] font-medium text-[#c9d4e5]">
                                {playgroundName}
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

                {/* Editor area */}
                <div className="flex flex-1 overflow-hidden">
                    {status === 'loading' && (
                        <div className="flex flex-1 items-center justify-center">
                            <div className="flex flex-col items-center gap-3 text-[#8ea5b5]">
                                <Loader2 size={28} className="animate-spin text-[#00d4aa]" />
                                <p className="text-sm">Loading playground…</p>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-1 items-center justify-center">
                            <div className="flex flex-col items-center gap-3 text-center">
                                <AlertTriangle size={28} className="text-amber-400" />
                                <p className="text-sm font-medium text-white">Could not load playground</p>
                                <p className="text-xs text-[#8ea5b5]">{errorMsg}</p>
                            </div>
                        </div>
                    )}

                    {status === 'ready' && (
                        <Editor
                            height="100%"
                            language={language}
                            value={code}
                            theme="modern-dark"
                            onMount={handleEditorMount}
                            options={readOnlyOptions}
                            path={`viewer-${playgroundId}.${language}`}
                        />
                    )}
                </div>
            </SidebarInset>
        </div>
    )
}
