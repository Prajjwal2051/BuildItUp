'use client'

import { Bot, X, Settings } from 'lucide-react'
import React from 'react'
import { simplifyAiErrorMessage } from '@/lib/ai-error'

type ChatRole = 'user' | 'assistant'

type ChatMessage = {
    id: string
    role: ChatRole
    content: string
}

interface PlaygroundAiSidebarProps {
    isOpen: boolean
    onClose: () => void
    fileName: string
    fileContent: string
    onInsertInEditor: (text: string) => void
    onOpenSettings?: () => void
    activeProvider?: string | null
}

// Shows the right-side AI chat area when enabled from the AI dropdown.
function PlaygroundAiSidebar({
    isOpen,
    onClose,
    fileName,
    fileContent,
    onInsertInEditor,
    onOpenSettings,
    activeProvider,
}: PlaygroundAiSidebarProps) {
    const [messages, setMessages] = React.useState<ChatMessage[]>([])
    const [input, setInput] = React.useState('')
    const [isSending, setIsSending] = React.useState(false)
    const [error, setError] = React.useState('')
    const [setupRequired, setSetupRequired] = React.useState(false)


    const bottomRef = React.useRef<HTMLDivElement>(null)
    React.useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Sends the user prompt with current file context and appends the assistant answer.
    const handleSend = React.useCallback(async () => {
        const prompt = input.trim()
        if (!prompt || isSending) return

        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: prompt,
        }

        const nextMessages = [...messages, userMessage]
        setMessages(nextMessages)
        setInput('')
        setIsSending(true)
        setError('')
        setSetupRequired(false)

        try {
            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: prompt,
                    fileName,
                    fileContent,
                    history: nextMessages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
                }),
            })

            const data = (await response.json()) as {
                assistant?: string
                error?: string
                setupRequired?: boolean
            }

            if (!response.ok) {
                if (data.setupRequired) setSetupRequired(true)
                throw new Error(data.error || 'Failed to get AI response')
            }

            const assistantContent = (data.assistant ?? '').trim()
            if (!assistantContent) throw new Error('AI returned an empty response')

            setMessages((previous) => [
                ...previous,
                { id: crypto.randomUUID(), role: 'assistant', content: assistantContent },
            ])
        } catch (requestError) {
            console.error('AI chat request failed:', requestError)
            const message = simplifyAiErrorMessage(requestError, 'Failed to send message')
            setError(message)
        } finally {
            setIsSending(false)
        }
    }, [fileContent, fileName, input, isSending, messages])

    const latestAssistantReply =
        [...messages].reverse().find((m) => m.role === 'assistant')?.content ?? ''

    if (!isOpen) return null

    return (
        <aside className="flex h-full w-85 shrink-0 flex-col border-l border-[#1e2028] bg-[#0c1117] text-[#c9d4e5]">
            <div className="flex items-center justify-between border-b border-[#1e2028] px-3 py-2">
                <div className="flex items-center gap-2 text-[12px] text-[#c9d4e5]">
                    <Bot size={14} className="text-[#00d4aa]" />
                    <span className="font-medium">AI Chat</span>
                    {activeProvider && (
                        <span className="rounded-full bg-[rgba(0,212,170,0.12)] px-2 py-0.5 text-[10px] text-[#00d4aa]">
                            {activeProvider}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {onOpenSettings && (
                        <button
                            type="button"
                            onClick={onOpenSettings}
                            className="rounded p-1 text-[#6a7280] hover:bg-[#11161d] hover:text-white"
                            aria-label="AI provider settings"
                            title="AI provider settings"
                        >
                            <Settings size={13} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded p-1 text-[#6a7280] hover:bg-[#11161d] hover:text-white"
                        aria-label="Close AI chat sidebar"
                        title="Close AI chat sidebar"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            <div className="border-b border-[#1e2028] px-3 py-2 text-[11px] text-[#6a7280]">
                Working file: <span className="text-[#c9d4e5]">{fileName || 'No file open'}</span>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
                {messages.length === 0 ? (
                    !activeProvider ? (
                        <div className="rounded-lg border border-[#1e2028] bg-[#11161d] px-3 py-3 text-[11px] text-[#9ab0be]">
                            <p className="mb-2 font-medium text-[#c9d4e5]">No AI provider configured</p>
                            <p className="mb-3 text-[#6a7280]">Set up a provider to start using AI features.</p>
                            {onOpenSettings && (
                                <button
                                    type="button"
                                    onClick={onOpenSettings}
                                    className="flex items-center gap-1.5 rounded-lg border border-[#0f4d40] bg-[#00d4aa] px-3 py-1.5 text-[11px] font-medium text-black hover:brightness-110"
                                >
                                    <Settings size={11} />
                                    Configure AI Provider
                                </button>
                            )}
                        </div>
                    ) : (
                        <p className="text-[12px] text-[#7f8f9d]">
                            Ask for refactors, bug fixes, or new code. The AI sees your open file.
                        </p>
                    )
                ) : (
                    messages.map((message) => (
                        <div
                            key={message.id}
                            className={
                                message.role === 'user'
                                    ? 'ml-6 rounded-xl border border-[#1e2028] bg-[#131a22] px-3 py-2 text-[12px] text-[#d6e1ef]'
                                    : 'mr-6 rounded-xl border border-[#1e2028] bg-[#10161d] px-3 py-2 text-[12px] text-[#c9d4e5]'
                            }
                        >
                            <div className="mb-1 text-[10px] uppercase tracking-wide text-[#6a7280]">
                                {message.role === 'user' ? 'You' : 'AI'}
                            </div>
                            <pre className="whitespace-pre-wrap font-sans leading-5">{message.content}</pre>
                            {message.role === 'assistant' && (
                                <div className="mt-2 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => onInsertInEditor(message.content)}
                                        className="rounded-md border border-[#1e2028] bg-[#11161d] px-2 py-1 text-[10px] text-[#9ab0be] transition-colors hover:border-[#00d4aa]/30 hover:text-white"
                                    >
                                        Insert ↑
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            <div className="space-y-2 border-t border-[#1e2028] px-3 py-3">
                {setupRequired && onOpenSettings ? (
                    <div className="rounded-lg border border-yellow-900/40 bg-yellow-950/20 px-3 py-2 text-[11px] text-yellow-400">
                        <p className="mb-1.5">AI provider not configured.</p>
                        <button
                            type="button"
                            onClick={onOpenSettings}
                            className="flex items-center gap-1 text-[#00d4aa] hover:underline"
                        >
                            <Settings size={11} /> Open Settings
                        </button>
                    </div>
                ) : error ? (
                    <p className="text-[11px] text-[#ef8d8d]">{error}</p>
                ) : null}

                <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault()
                            void handleSend()
                        }
                    }}
                    placeholder="Ask AI about this file..."
                    className="h-24 w-full resize-none rounded-xl border border-[#1e2028] bg-[#11161d] px-2 py-2 text-[12px] text-[#d6e1ef] outline-none placeholder:text-[#6a7280]"
                />

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => void handleSend()}
                        disabled={isSending || !input.trim()}
                        className="rounded-lg border border-[#0f4d40] bg-[#00d4aa] px-3 py-1.5 text-[11px] font-medium text-black transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSending ? 'Sending...' : 'Send'}
                    </button>
                    <button
                        type="button"
                        onClick={() => onInsertInEditor(latestAssistantReply)}
                        disabled={!latestAssistantReply}
                        className="rounded-lg border border-[#1e2028] bg-[#11161d] px-3 py-1.5 text-[11px] text-[#c9d4e5] transition-colors hover:border-[#00d4aa]/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Insert in editor
                    </button>
                </div>
            </div>
        </aside>
    )
}

export default PlaygroundAiSidebar
