// Normalizes verbose provider payloads into short user-facing messages.

function tryParseJsonFragment(value: string): unknown {
    const start = value.indexOf('{')
    const end = value.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) return null

    try {
        return JSON.parse(value.slice(start, end + 1))
    } catch {
        return null
    }
}

function collectMessages(input: unknown): string[] {
    if (!input) return []
    if (typeof input === 'string') return [input]
    if (Array.isArray(input)) return input.flatMap(collectMessages)
    if (typeof input !== 'object') return []

    const record = input as Record<string, unknown>
    return Object.entries(record).flatMap(([key, value]) => {
        if (key === 'message' || key === 'reason' || key === 'error' || key === 'details') {
            return collectMessages(value)
        }
        return typeof value === 'object' ? collectMessages(value) : []
    })
}

function matchFriendlyMessage(message: string): string | null {
    const normalized = message.toLowerCase()

    if (
        normalized.includes('api_key_invalid') ||
        normalized.includes('api key not valid') ||
        normalized.includes('invalid api key') ||
        normalized.includes('incorrect api key')
    ) {
        return 'Invalid API key. Check your key and try again.'
    }

    if (
        normalized.includes('unauthorized') ||
        normalized.includes('authentication') ||
        normalized.includes('invalid_api_key')
    ) {
        return 'Authentication failed. Check your API key and provider settings.'
    }

    if (
        normalized.includes('quota') ||
        normalized.includes('rate limit') ||
        normalized.includes('too many requests') ||
        normalized.includes('insufficient_quota')
    ) {
        return 'Rate limit or quota exceeded. Try again later or check your provider plan.'
    }

    if (
        normalized.includes('model') &&
        (normalized.includes('not found') ||
            normalized.includes('does not exist') ||
            normalized.includes('unsupported') ||
            normalized.includes('unavailable'))
    ) {
        return 'The selected model is unavailable for this provider.'
    }

    if (
        normalized.includes('max tokens') ||
        normalized.includes('maximum context') ||
        normalized.includes('context length') ||
        normalized.includes('too many tokens')
    ) {
        return 'The request is too large for the selected model.'
    }

    if (
        normalized.includes('network error') ||
        normalized.includes('failed to fetch') ||
        normalized.includes('could not reach the server')
    ) {
        return 'Could not reach the AI service. Please try again.'
    }

    return null
}

export function simplifyAiErrorMessage(error: unknown, fallback = 'Something went wrong with the AI provider.'): string {
    const raw =
        typeof error === 'string'
            ? error
            : error instanceof Error
                ? error.message
                : fallback

    const directMatch = matchFriendlyMessage(raw)
    if (directMatch) return directMatch

    const parsed = tryParseJsonFragment(raw)
    const extracted = collectMessages(parsed).join(' | ')
    const parsedMatch = extracted ? matchFriendlyMessage(extracted) : null
    if (parsedMatch) return parsedMatch

    if (extracted) {
        return extracted.split(' | ')[0]
    }

    return raw.trim() || fallback
}
