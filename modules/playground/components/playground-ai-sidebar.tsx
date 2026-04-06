'use client'

import { Bot, X } from 'lucide-react'
import React from 'react'

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
}

// Shows the right-side AI chat area when enabled from the AI dropdown.
function PlaygroundAiSidebar({
    isOpen,
    onClose,
    fileName,
    fileContent,
    onInsertInEditor,
}: PlaygroundAiSidebarProps) {
    const [messages, setMessages] = React.useState<ChatMessage[]>([])
    const [input, setInput] = React.useState('')
    const [isSending, setIsSending] = React.useState(false)
    const [error, setError] = React.useState('')

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

        try {
            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: prompt,
                    fileName,
                    fileContent,
                    history: nextMessages.slice(-8).map((messageItem) => ({
                        role: messageItem.role,
                        content: messageItem.content,
                    })),
                }),
            })

            const data = (await response.json()) as {
                assistant?: string
                error?: string
            }

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get AI response')
            }

            const assistantContent = (data.assistant ?? '').trim()
            if (!assistantContent) {
                throw new Error('AI returned an empty response')
            }

            setMessages((previous) => [
                ...previous,
                {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: assistantContent,
                },
            ])
        } catch (requestError) {
            const message =
                requestError instanceof Error ? requestError.message : 'Failed to send message'
            setError(message)
        } finally {
            setIsSending(false)
        }
    }, [fileContent, fileName, input, isSending, messages])

    const latestAssistantReply =
        [...messages].reverse().find((message) => message.role === 'assistant')?.content ?? ''

    if (!isOpen) return null

    return (
        <aside className="flex h-full w-85 shrink-0 flex-col border-l border-[#1c1f26] bg-[#0b0d11]">
            <div className="flex items-center justify-between border-b border-[#1c1f26] px-3 py-2">
                <div className="flex items-center gap-2 text-[12px] text-[#aab1bf]">
                    <Bot size={14} />
                    <span className="font-medium">AI Chat</span>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded p-1 text-[#71798a] hover:bg-[#151922] hover:text-white"
                    aria-label="Close AI chat sidebar"
                    title="Close AI chat sidebar"
                >
                    <X size={14} />
                </button>
            </div>

            <div className="border-b border-[#1c1f26] px-3 py-2 text-[11px] text-[#71798a]">
                Working file: <span className="text-[#aab1bf]">{fileName || 'No file open'}</span>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
                {messages.length === 0 ? (
                    <p className="text-[12px] text-[#7d8596]">
                        Ask for refactors, bug fixes, or new code. The AI sees your open file.
                    </p>
                ) : (
                    messages.map((message) => (
                        <div
                            key={message.id}
                            className={
                                message.role === 'user'
                                    ? 'ml-6 rounded-md border border-[#2a2f3a] bg-[#141821] px-3 py-2 text-[12px] text-[#d2d8e4]'
                                    : 'mr-6 rounded-md border border-[#2a2f3a] bg-[#10141d] px-3 py-2 text-[12px] text-[#aab1bf]'
                            }
                        >
                            <div className="mb-1 text-[10px] uppercase tracking-wide text-[#6f7788]">
                                {message.role === 'user' ? 'You' : 'AI'}
                            </div>
                            <pre className="whitespace-pre-wrap font-sans leading-5">
                                {message.content}
                            </pre>
                        </div>
                    ))
                )}
            </div>

            <div className="space-y-2 border-t border-[#1c1f26] px-3 py-3">
                {error ? <p className="text-[11px] text-[#ef8d8d]">{error}</p> : null}

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
                    className="h-24 w-full resize-none rounded-md border border-[#2a2f3a] bg-[#141821] px-2 py-2 text-[12px] text-[#d2d8e4] outline-none placeholder:text-[#6f7788]"
                />

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => void handleSend()}
                        disabled={isSending || !input.trim()}
                        className="rounded-md border border-[#3a4150] bg-[#1b2130] px-3 py-1.5 text-[11px] text-[#dbe8ff] transition-colors hover:border-[#61afef] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSending ? 'Sending...' : 'Send'}
                    </button>

                    <button
                        type="button"
                        onClick={() => onInsertInEditor(latestAssistantReply)}
                        disabled={!latestAssistantReply}
                        className="rounded-md border border-[#2a2f3a] px-3 py-1.5 text-[11px] text-[#aab1bf] transition-colors hover:border-[#3a4150] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Insert in editor
                    </button>
                </div>
            </div>
        </aside>
    )
}

export default PlaygroundAiSidebar
