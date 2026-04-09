import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@/auth'
import { resolveUserAiConfig } from '@/modules/playground/actions/ai-settings'
import { callAiProvider, type AiMessage } from '@/lib/ai-providers'
import { sanitizeAssistantResponse } from '@/lib/ai-sanitize'

type ChatMessage = {
    role: 'user' | 'assistant'
    content: string
}

type ChatRequestBody = {
    message: string
    fileName?: string
    fileContent?: string
    history?: ChatMessage[]
}

// Handles AI chat requests with optional file context from the playground editor.
// Supports Ollama (local/remote), OpenAI, Gemini, and Anthropic.
export async function POST(request: NextRequest) {
    try {
        // ── Auth ──────────────────────────────────────────────────────────────
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // ── Parse body ────────────────────────────────────────────────────────
        const body = (await request.json()) as ChatRequestBody
        const message = typeof body.message === 'string' ? body.message.trim() : ''
        const fileName = typeof body.fileName === 'string' ? body.fileName : 'unknown'
        const fileContent = typeof body.fileContent === 'string' ? body.fileContent : ''
        const history = Array.isArray(body.history) ? body.history : []

        if (!message) {
            return NextResponse.json({ error: 'message is required' }, { status: 400 })
        }

        const normalizedHistory = history
            .filter((item) => item && (item.role === 'user' || item.role === 'assistant'))
            .slice(-10)

        // ── Resolve user AI config ────────────────────────────────────────────
        const config = await resolveUserAiConfig(session.user.id)

        if (!config.provider) {
            return NextResponse.json(
                {
                    error: 'AI provider not configured. Please set up your AI provider in Settings.',
                    setupRequired: true,
                },
                { status: 503 },
            )
        }

        // ── Build messages ────────────────────────────────────────────────────
        const messages: AiMessage[] = [
            {
                role: 'system',
                content:
                    'You are an expert coding assistant for a browser editor. Keep answers concise and practical. When asked to generate code, return only raw code with no markdown fences, no backticks, and no introductory text unless the user explicitly asks for explanation.',
            },
            ...normalizedHistory.map((h) => ({ role: h.role, content: h.content }) as AiMessage),
            {
                role: 'user',
                content: [
                    `Current file: ${fileName}`,
                    fileContent
                        ? `Current file content:\n${fileContent.slice(0, 12000)}`
                        : 'Current file content is empty.',
                    `User request:\n${message}`,
                ].join('\n\n'),
            },
        ]

        // ── Call provider ─────────────────────────────────────────────────────
        const result = await callAiProvider({
            provider: config.provider,
            messages,
            apiKey: config.apiKey ?? undefined,
            ollamaBaseUrl: config.ollamaBaseUrl ?? undefined,
        })

        const assistant = sanitizeAssistantResponse(result.content)
        return NextResponse.json({ assistant, provider: result.provider, model: result.model })
    } catch (error) {
        console.error('Error in AI chat route:', error)
        const message = error instanceof Error ? error.message : 'Failed to process AI chat request'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
