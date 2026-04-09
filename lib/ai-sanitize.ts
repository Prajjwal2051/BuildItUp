// Shared response sanitizers used by both AI route handlers.

// Normalizes model output so chat insertion actions receive plain code without markdown wrappers.
export function sanitizeAssistantResponse(content: string): string {
    const trimmedContent = content.trim()
    const fencedBlockMatch = trimmedContent.match(/```[\w-]*\n?([\s\S]*?)```/)
    if (fencedBlockMatch) return fencedBlockMatch[1].trim()
    const lines = trimmedContent.split('\n')
    if (lines.length > 1 && /^(sure|here|okay|alright|this|below)\b/i.test(lines[0].trim()) && lines[0].includes(':')) {
        return lines.slice(1).join('\n').trim()
    }
    return trimmedContent
}

// Removes markdown fences so the editor always receives plain insertable code.
export function sanitizeCodeSuggestion(suggestion: string): string {
    const trimmed = suggestion.trim()
    const fencedBlockMatch = trimmed.match(/^```[\w-]*\n?([\s\S]*?)\n?```$/)
    if (fencedBlockMatch) return fencedBlockMatch[1].trimEnd()
    const lines = trimmed.split('\n')
    if (lines[0]?.trimStart().startsWith('```')) lines.shift()
    if (lines[lines.length - 1]?.trim() === '```') lines.pop()
    return lines.join('\n').trimEnd()
}
