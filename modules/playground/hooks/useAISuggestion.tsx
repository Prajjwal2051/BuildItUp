import { useCallback, useState } from 'react'

type SuggestionRequest = {
    fileName: string
    fileContent: string
    cursorLine: number
    cursorColumn: number
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

    const clearSuggestion = useCallback(() => {
        setSuggestion('')
        setError('')
    }, [])

    // Calls the completion route with file context and cursor so AI can suggest the next code.
    const fetchSuggestion = useCallback(
        async ({ fileName, fileContent, cursorLine, cursorColumn }: SuggestionRequest) => {
            if (!enabled) {
                clearSuggestion()
                return ''
            }

            if (!fileContent.trim()) {
                clearSuggestion()
                return ''
            }

            setIsLoading(true)
            setError('')

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
                setSuggestion(nextSuggestion)
                return nextSuggestion
            } catch (requestError) {
                const message =
                    requestError instanceof Error
                        ? requestError.message
                        : 'Failed to fetch AI suggestion'
                setError(message)
                setSuggestion('')
                return ''
            } finally {
                setIsLoading(false)
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
