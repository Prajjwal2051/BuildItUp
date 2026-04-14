// Unified AI provider abstraction.
// Each provider adapter receives a prompt (system + user messages) and returns
// a plain string response. All HTTP calls are made server-side only.

import { getOllamaBaseUrl, normalizeBaseUrl } from './ai-config'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'

export type AiProviderType =
    | 'OLLAMA_LOCAL'
    | 'OLLAMA_REMOTE'
    | 'OPENAI'
    | 'GEMINI'
    | 'ANTHROPIC'
    | 'OPEN_ROUTER'

export interface AiMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface AiRequestOptions {
    provider: AiProviderType
    messages: AiMessage[]
    apiKey?: string // required for OPENAI, GEMINI, ANTHROPIC, OLLAMA_REMOTE
    ollamaBaseUrl?: string // required for OLLAMA_REMOTE; uses env for OLLAMA_LOCAL
    model?: string // optional override — each provider has a sensible default
    temperature?: number
    maxTokens?: number
}

export interface AiResponse {
    content: string
    provider: AiProviderType
    model: string
}

// ─── Default models per provider ───────────────────────────────────────────

const DEFAULT_MODELS: Record<AiProviderType, string> = {
    OLLAMA_LOCAL: 'qwen2.5-coder:7b',
    OLLAMA_REMOTE: 'qwen2.5-coder:7b',
    OPENAI: 'gpt-4o-mini',
    GEMINI: 'gemini-2.0-flash',
    ANTHROPIC: 'claude-3-5-haiku-20251022',
    OPEN_ROUTER: 'openai/gpt-4o-mini',
}

// ─── Entry point ────────────────────────────────────────────────────────────

export async function callAiProvider(options: AiRequestOptions): Promise<AiResponse> {
    const { provider } = options

    switch (provider) {
        case 'OLLAMA_LOCAL':
        case 'OLLAMA_REMOTE':
            return callOllama(options)
        case 'OPENAI':
            return callOpenAi(options)
        case 'GEMINI':
            return callGemini(options)
        case 'ANTHROPIC':
            return callAnthropic(options)
        case 'OPEN_ROUTER':
            return callOpenRouter(options)
        default: {
            const exhaustive: never = provider
            throw new Error(`Unknown AI provider: ${String(exhaustive)}`)
        }
    }
}
// ---- OpenRouter ───────────────────────────────────────────────────────────────
async function callOpenRouter(options: AiRequestOptions): Promise<AiResponse> {
    const { apiKey, messages, model, temperature, maxTokens } = options
    if (!apiKey) throw new Error('OpenRouter API key is required')

    const resolvedModel = model ?? DEFAULT_MODELS.OPEN_ROUTER

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'https://builditup.app',
            'X-Title': 'BuildItUp',
        },
        body: JSON.stringify({
            model: resolvedModel,
            messages,
            temperature: temperature ?? 0.2,
            max_tokens: maxTokens ?? 512,
        }),
    })

    if (!response.ok) {
        const err = await response.text()
        throw new Error(`OpenRouter API error ${response.status}: ${err}`)
    }

    const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[]
    }
    return {
        content: (data.choices?.[0]?.message?.content ?? '').trim(),
        provider: 'OPEN_ROUTER',
        model: resolvedModel,
    }
}

// ─── Ollama ──────────────────────────────────────────────────────────────────

async function callOllama(options: AiRequestOptions): Promise<AiResponse> {
    const { provider, messages, apiKey, ollamaBaseUrl, model, temperature, maxTokens } = options

    let baseUrl: string
    if (provider === 'OLLAMA_LOCAL') {
        try {
            baseUrl = getOllamaBaseUrl()
        } catch {
            throw new Error(
                'Ollama local mode is only available in development. Please switch to a cloud provider (OpenAI, Gemini, or Anthropic) in AI Settings.',
            )
        }
    } else {
        if (!ollamaBaseUrl) {
            throw new Error('ollamaBaseUrl is required for OLLAMA_REMOTE provider')
        }
        baseUrl = normalizeBaseUrl(ollamaBaseUrl, 'ollamaBaseUrl')
    }

    const resolvedModel = model ?? (await resolveOllamaModel(baseUrl, apiKey))
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

    const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: resolvedModel,
            stream: false,
            messages,
            options: {
                temperature: temperature ?? 0.2,
                num_predict: maxTokens ?? 512,
            },
        }),
    })

    if (!response.ok) {
        const err = await response.text()
        throw new Error(`Ollama API error ${response.status}: ${err}`)
    }

    const data = (await response.json()) as { message?: { content?: string } }
    return {
        content: (data.message?.content ?? '').trim(),
        provider,
        model: resolvedModel,
    }
}

async function resolveOllamaModel(baseUrl: string, apiKey?: string): Promise<string> {
    const preferred = [
        process.env.OLLAMA_MODEL,
        'qwen2.5-coder:7b',
        'qwen2.5-coder:3b',
        'codellama:7b',
        'llama3.1:8b',
    ].filter((m): m is string => typeof m === 'string' && m.length > 0)

    const headers: Record<string, string> = {}
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

    try {
        const res = await fetch(`${baseUrl}/api/tags`, { cache: 'no-store', headers })
        if (!res.ok) return preferred[0]

        const data = (await res.json()) as { models?: { name?: string }[] }
        const installed = (data.models ?? []).map((m) => m.name?.trim()).filter(Boolean) as string[]
        if (installed.length === 0) return preferred[0]

        for (const p of preferred) {
            if (installed.includes(p)) return p
        }
        return installed[0]
    } catch {
        return preferred[0]
    }
}

// ─── OpenAI ──────────────────────────────────────────────────────────────────

async function callOpenAi(options: AiRequestOptions): Promise<AiResponse> {
    const { apiKey, messages, model, temperature, maxTokens } = options
    if (!apiKey) throw new Error('OpenAI API key is required')

    const resolvedModel = model ?? DEFAULT_MODELS.OPENAI
    const client = new OpenAI({ apiKey })

    const res = await client.chat.completions.create({
        model: resolvedModel,
        messages,
        temperature: temperature ?? 0.2,
        max_tokens: maxTokens ?? 512,
    })

    return {
        content: res.choices[0]?.message?.content?.trim() ?? '',
        provider: 'OPENAI',
        model: resolvedModel,
    }
}

// ─── Gemini ──────────────────────────────────────────────────────────────────
// Uses the Gemini REST API (v1beta generateContent) with a chat-compatible
// system + user/model turn format.

async function callGemini(options: AiRequestOptions): Promise<AiResponse> {
    const { apiKey, messages, model, temperature, maxTokens } = options
    if (!apiKey) throw new Error('Gemini API key is required')

    const resolvedModel = model ?? DEFAULT_MODELS.GEMINI
    const client = new GoogleGenAI({ apiKey })

    const systemMsg = messages.find((m) => m.role === 'system')
    const conversationMsgs = messages.filter((m) => m.role !== 'system')

    const res = await client.models.generateContent({
        model: resolvedModel,
        contents: conversationMsgs.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        })),
        config: {
            systemInstruction: systemMsg?.content,
            temperature: temperature ?? 0.2,
            maxOutputTokens: maxTokens ?? 512,
        },
    })

    return {
        content: res.text?.trim() ?? '',
        provider: 'GEMINI',
        model: resolvedModel,
    }
}

// ─── Anthropic ───────────────────────────────────────────────────────────────

async function callAnthropic(options: AiRequestOptions): Promise<AiResponse> {
    const { apiKey, messages, model, temperature, maxTokens } = options
    if (!apiKey) throw new Error('Anthropic API key is required')

    const resolvedModel = model ?? DEFAULT_MODELS.ANTHROPIC
    const client = new Anthropic({ apiKey })

    const systemMsg = messages.find((m) => m.role === 'system')
    const conversationMsgs = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const res = await client.messages.create({
        model: resolvedModel,
        max_tokens: maxTokens ?? 512,
        temperature: temperature ?? 0.2,
        system: systemMsg?.content,
        messages: conversationMsgs,
    })

    const text = res.content.find((b) => b.type === 'text')?.text ?? ''
    return {
        content: text.trim(),
        provider: 'ANTHROPIC',
        model: resolvedModel,
    }
}
