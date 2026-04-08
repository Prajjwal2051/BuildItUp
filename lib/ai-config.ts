const ALLOWED_OLLAMA_SCHEMES = new Set(['http:', 'https:'])

// Resolves and validates Ollama base URL from env so API routes never rely on hardcoded localhost.
export function getOllamaBaseUrl(): string {
    const baseUrl = process.env.OLLAMA_BASE_URL

    if (!baseUrl) {
        throw new Error('OLLAMA_BASE_URL environment variable is not configured')
    }

    let parsedUrl: URL
    try {
        parsedUrl = new URL(baseUrl)
    } catch {
        throw new Error(`OLLAMA_BASE_URL is not a valid URL: ${baseUrl}`)
    }

    if (!ALLOWED_OLLAMA_SCHEMES.has(parsedUrl.protocol)) {
        throw new Error(`OLLAMA_BASE_URL uses a disallowed protocol: ${parsedUrl.protocol}`)
    }

    return parsedUrl.origin
}
