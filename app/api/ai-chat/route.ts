import { NextResponse, type NextRequest } from 'next/server'

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
export async function POST(request: NextRequest) {
    try {
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

        const response = await fetch('http://localhost:11434/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'qwen2.5-coder:7b',
                stream: false,
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are an expert coding assistant for a browser editor. Keep answers concise and practical. When asked to generate code, return code only unless the user asks for explanation.',
                    },
                    ...normalizedHistory,
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
                ],
                options: {
                    temperature: 0.2,
                    num_predict: 512,
                },
            }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            return NextResponse.json(
                { error: `AI API error ${response.status}: ${errorText}` },
                { status: 502 },
            )
        }

        const data = (await response.json()) as {
            message?: {
                content?: string
            }
        }

        const assistant = data.message?.content?.trim() ?? ''
        return NextResponse.json({ assistant })
    } catch (error) {
        console.error('Error in AI chat route:', error)
        return NextResponse.json({ error: 'Failed to process AI chat request' }, { status: 500 })
    }
}
