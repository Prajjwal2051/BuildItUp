'use server'

import { db } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/encryption'
import { currentUser } from '@/modules/auth/actions'
import type { AiProviderType } from '@/lib/ai-providers'

export type SaveAiSettingsInput = {
    provider: AiProviderType
    apiKey?: string       // raw key from the user — we encrypt before storing
    ollamaBaseUrl?: string
    model?: string
}

export type AiSettingsResult = {
    provider: AiProviderType | null
    hasKey: boolean          // true when an encrypted key exists — never exposes the raw key
    ollamaBaseUrl: string | null
    model: string | null
}

// Saves the user's chosen AI provider and (optionally) an API key.
// The key is AES-256-GCM encrypted before writing to the database.
export async function saveAiSettings(input: SaveAiSettingsInput): Promise<{ success: boolean; error?: string }> {
    const user = await currentUser()
    if (!user?.id) return { success: false, error: 'Unauthorized' }

    try {
        const updateData: Record<string, unknown> = {
            aiProvider: input.provider,
            aiModel: input.model?.trim() || null, // Store model if provided, or null to clear
        }

        // Only update the key when the caller actually sends one.
        // Sending an empty string clears the stored key.
        if (typeof input.apiKey === 'string') {
            updateData.encryptedApiKey = input.apiKey.trim()
                ? encrypt(input.apiKey.trim())
                : null
        }

        if (input.provider === 'OLLAMA_REMOTE') {
            const url = input.ollamaBaseUrl?.trim() ?? ''
            if (!url) return { success: false, error: 'Ollama base URL is required for remote mode' }
            // Basic URL validation before persisting
            try { new URL(url) } catch {
                return { success: false, error: 'Ollama base URL is not a valid URL' }
            }
            updateData.ollamaBaseUrl = url
        } else {
            // Clear the URL for non-Ollama-remote providers so stale data is not used.
            updateData.ollamaBaseUrl = null
        }

        await db.user.update({
            where: { id: user.id },
            data: updateData as Parameters<typeof db.user.update>[0]['data'],
        })

        return { success: true }
    } catch (error) {
        console.error('saveAiSettings error:', error)
        return { success: false, error: 'Failed to save AI settings' }
    }
}

// Returns the current AI settings for the authenticated user.
// The raw API key is NEVER returned — only a boolean `hasKey`.
export async function getAiSettings(): Promise<AiSettingsResult | null> {
    const user = await currentUser()
    if (!user?.id) return null

    try {
        const dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: {
                aiProvider: true,
                encryptedApiKey: true,
                ollamaBaseUrl: true,
                aiModel: true,  // Include aiModel in the selection for future use, even if it's not returned in the result yet
            },
        })
        if (!dbUser) return null

        return {
            provider: (dbUser.aiProvider as AiProviderType | null),
            hasKey: Boolean(dbUser.encryptedApiKey),
            ollamaBaseUrl: dbUser.ollamaBaseUrl ?? null,
            model: dbUser.aiModel ?? null, // Placeholder for future model-specific settings
        }
    } catch (error) {
        console.error('getAiSettings error:', error)
        return null
    }
}

// Internal-only helper used by API routes. Returns the decrypted key.
// Must never be exported as a server action — it is called only from route handlers.
export async function resolveUserAiConfig(userId: string): Promise<{
    provider: AiProviderType | null
    apiKey: string | null
    ollamaBaseUrl: string | null
    model: string | null
}> {
    try {
        const dbUser = await db.user.findUnique({
            where: { id: userId },
            select: {
                aiProvider: true,
                encryptedApiKey: true,
                ollamaBaseUrl: true,
                aiModel: true,
            },
        })

        if (!dbUser) return { provider: null, apiKey: null, ollamaBaseUrl: null, model: null}

        let apiKey: string | null = null
        if (dbUser.encryptedApiKey) {
            try {
                apiKey = decrypt(dbUser.encryptedApiKey)
            } catch {
                // If decryption fails (e.g., rotated secret), treat as no key
                apiKey = null
            }
        }

        return {
            provider: (dbUser.aiProvider as AiProviderType | null),
            apiKey,
            ollamaBaseUrl: dbUser.ollamaBaseUrl ?? null,
            model: dbUser.aiModel ?? null,
        }
    } catch (error) {
        console.error('resolveUserAiConfig error:', error)
        return { provider: null, apiKey: null, ollamaBaseUrl: null, model: null}
    }
}
