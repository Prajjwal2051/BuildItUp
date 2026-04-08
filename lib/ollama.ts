type OllamaTagItem = {
    name?: string
}

type OllamaTagsResponse = {
    models?: OllamaTagItem[]
}

import { getOllamaBaseUrl } from '@/lib/ai-config'

function getPreferredModels(): string[] {
    return [
        process.env.OLLAMA_MODEL,
        'qwen2.5-coder:7b',
        'qwen2.5-coder:3b',
        'codellama:7b',
        'llama3.1:8b',
    ].filter((model): model is string => typeof model === 'string' && model.length > 0)
}

export async function resolveOllamaModel(): Promise<{ model: string | null; error?: string }> {
    try {
        const baseUrl = getOllamaBaseUrl()
        const response = await fetch(`${baseUrl}/api/tags`, {
            cache: 'no-store',
        })

        if (!response.ok) {
            return {
                model: null,
                error: `Unable to read Ollama models (${response.status})`,
            }
        }

        const data = (await response.json()) as OllamaTagsResponse
        const installedModels = (data.models ?? [])
            .map((item) => item.name?.trim())
            .filter((name): name is string => Boolean(name))

        if (installedModels.length === 0) {
            return {
                model: null,
                error: `No Ollama models are installed. Pull one first, for example: ollama pull ${getPreferredModels()[0]}`,
            }
        }

        for (const preferredModel of getPreferredModels()) {
            if (installedModels.includes(preferredModel)) {
                return { model: preferredModel }
            }
        }

        return { model: installedModels[0] }
    } catch {
        return {
            model: null,
            error: 'Unable to connect to Ollama. Start the Ollama service and try again.',
        }
    }
}