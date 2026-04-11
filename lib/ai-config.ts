import type { AiProviderType } from './ai-providers'

const ALLOWED_SCHEMES = new Set(['http:', 'https:'])

// Parses and validates a URL, throwing on bad input.
function parseAndValidateUrl(url: string, label: string): URL {
    let parsed: URL
    try {
        parsed = new URL(url)
    } catch {
        throw new Error(`${label} is not a valid URL: ${url}`)
    }
    if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
        throw new Error(`${label} uses a disallowed protocol: ${parsed.protocol}`)
    }
    return parsed
}

// Validates and returns a host-only base URL, throwing on bad input.
export function validateBaseUrl(url: string, label: string): string {
    return parseAndValidateUrl(url, label).origin
}

// Validates and returns a base URL while preserving any configured path prefix.
export function normalizeBaseUrl(url: string, label: string): string {
    const parsed = parseAndValidateUrl(url, label)
    return parsed.href.replace(/\/+$/, '')
}

// Resolves and validates the local Ollama base URL from env.
export function getOllamaBaseUrl(): string {
    const baseUrl = process.env.OLLAMA_BASE_URL
    if (!baseUrl) {
        throw new Error('OLLAMA_BASE_URL environment variable is not configured')
    }
    return validateBaseUrl(baseUrl, 'OLLAMA_BASE_URL')
}

// Returns a human-readable label for each provider.
export function providerLabel(provider: AiProviderType): string {
    const labels: Record<AiProviderType, string> = {
        OLLAMA_LOCAL:  'Ollama (Local)',
        OLLAMA_REMOTE: 'Ollama (Remote)',
        OPENAI:        'OpenAI',
        GEMINI:        'Google Gemini',
        ANTHROPIC:     'Anthropic Claude',
    }
    return labels[provider]
}

// Returns placeholder text for the API key input per provider.
export function providerKeyPlaceholder(provider: AiProviderType): string {
    const placeholders: Record<AiProviderType, string> = {
        OLLAMA_LOCAL:  'No key needed',
        OLLAMA_REMOTE: 'Bearer token (optional)',
        OPENAI:        'sk-...',
        GEMINI:        'AIza...',
        ANTHROPIC:     'sk-ant-...',
    }
    return placeholders[provider]
}
