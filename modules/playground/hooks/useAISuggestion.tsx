import { useCallback, useRef, useState } from 'react'
import { simplifyAiErrorMessage } from '@/lib/ai-error'

type SuggestionRequest = {
    fileName: string
    fileContent: string
    cursorLine: number
    cursorColumn: number
    selectionStartLine?: number
    selectionStartColumn?: number
    selectionEndLine?: number
    selectionEndColumn?: number
    selectedText?: string
}

type UseAISuggestionOptions = {
    enabled: boolean
}

type UseAISuggestionReturn = {
    suggestion: string
    isLoading: boolean
    error: string
    fetchSuggestion: (request: SuggestionRequest) => Promise<string>
    clearSuggestion: () => void
}

// Fetches one inline code suggestion so the editor can request/apply completions on demand.
function useAISuggestion({ enabled }: UseAISuggestionOptions): UseAISuggestionReturn {
    const [suggestion, setSuggestion] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const requestCounterRef = useRef(0)
    const cacheRef = useRef<{ key: string; value: string; time: number } | null>(null)

    const clearSuggestion = useCallback(() => {
        setSuggestion('')
        setError('')
    }, [])

    // Calls the completion route with file context and cursor so AI can suggest the next code.
    const fetchSuggestion = useCallback(
        async ({
            fileName,
            fileContent,
            cursorLine,
            cursorColumn,
            selectionStartLine,
            selectionStartColumn,
            selectionEndLine,
            selectionEndColumn,
            selectedText,
        }: SuggestionRequest) => {
            if (!enabled) {
                clearSuggestion()
                return ''
            }

            if (!fileContent.trim()) {
                clearSuggestion()
                return ''
            }

            const requestKey = [
                fileName,
                cursorLine,
                cursorColumn,
                selectionStartLine ?? '',
                selectionStartColumn ?? '',
                selectionEndLine ?? '',
                selectionEndColumn ?? '',
                selectedText ?? '',
                fileContent.slice(Math.max(0, fileContent.length - 1200)),
            ].join('|')

            const now = Date.now()
            const cached = cacheRef.current
            if (cached && cached.key === requestKey && now - cached.time < 1500) {
                setSuggestion(cached.value)
                return cached.value
            }

            setIsLoading(true)
            setError('')
            const requestId = ++requestCounterRef.current

            try {
                const response = await fetch('/api/code-completion', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        fileContent,
                        cursorLine,
                        cursorColumn,
                        suggestionType: 'code',
                        fileName,
                        selectionStartLine,
                        selectionStartColumn,
                        selectionEndLine,
                        selectionEndColumn,
                        selectedText,
                    }),
                })

                const data = (await response.json()) as {
                    suggestion?: string
                    error?: string
                }

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch AI suggestion')
                }

                const nextSuggestion = (data.suggestion ?? '').trim()
                if (requestId === requestCounterRef.current) {
                    setSuggestion(nextSuggestion)
                    cacheRef.current = { key: requestKey, value: nextSuggestion, time: Date.now() }
                }
                return nextSuggestion
            } catch (requestError) {
                if (requestId !== requestCounterRef.current) {
                    return ''
                }

                console.error('AI autocomplete request failed:', requestError)
                const message = simplifyAiErrorMessage(
                    requestError,
                    'Failed to fetch AI suggestion',
                )
                setError(message)
                setSuggestion('')
                return ''
            } finally {
                if (requestId === requestCounterRef.current) {
                    setIsLoading(false)
                }
            }
        },
        [clearSuggestion, enabled],
    )

    return {
        suggestion,
        isLoading,
        error,
        fetchSuggestion,
        clearSuggestion,
    }
}

export default useAISuggestion
