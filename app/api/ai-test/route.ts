// this route is for testing the ai api route
// it is not used in production and can be deleted later

import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@/auth'
import { resolveUserAiConfig } from '@/modules/playground/actions/ai-settings'
import { callAiProvider } from '@/lib/ai-providers'

export async function POST(request: NextRequest) {
    try {
        // first we will fetch the session to get the user id  -- validation state
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json(
                {
                    ok: false,
                    error: 'Unauthorized',
                },
                { status: 401 },
            )
        }

        // now we will accept the optional overrrides for the ai config in the request body
        const rawBody = (await request.json().catch(() => null)) as {
            provider?: string
            apiKey?: string
            apikey?: string
            ollamaBaseUrl?: string
            model?: string
        } | null

        // When the request has no JSON body (common for quick connection tests),
        // use an empty object so optional override reads do not crash.
        const body = rawBody ?? {}

        // if overrides config is not priovided then i need to fetch it from the db
        type UserAiConfig = Awaited<ReturnType<typeof resolveUserAiConfig>>
        const config = body.provider
            ? {
                  provider: body.provider as UserAiConfig['provider'],
                  apiKey: body.apiKey ?? body.apikey,
                  ollamaBaseUrl: body.ollamaBaseUrl ?? null,
                  model: body.model ?? null,
              }
            : await resolveUserAiConfig(session.user.id)

        if (!config.provider) {
            return NextResponse.json(
                { ok: false, error: 'No provider configured. Please set up AI Settings first.' },
                { status: 400 },
            )
        }

        const result = await callAiProvider({
            provider: config.provider,
            messages: [
                {
                    role: 'user',
                    content: 'Reply with a single word: Ok',
                },
            ],
            apiKey: config.apiKey ?? undefined,
            ollamaBaseUrl: config.ollamaBaseUrl ?? undefined,
            model: config.model ?? undefined,
            temperature: 0,
            maxTokens: 5,
        })

        return NextResponse.json({
            ok: true,
            provider: result.provider,
            model: result.model,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Connection Failed'
        return NextResponse.json(
            {
                ok: false,
                error: message,
            },
            {
                status: 200,
            },
            // Note: intentionally 200 so the client always receives JSON, not a network error
        )
    }
}
