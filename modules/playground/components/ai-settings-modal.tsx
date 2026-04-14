'use client'

/// This component provides a modal dialog for configuring AI provider settings in the playground. It supports multiple providers (Ollama local/remote, OpenAI, Google Gemini, Anthropic Claude) and allows users to enter API keys and other necessary information. Settings are saved securely and persistently via the saveAiSettings action. The UI includes validation, loading states, and helpful links to provider documentation.

// import necessary libraries and components
import React from 'react'
import {
    Settings,
    Eye,
    EyeOff,
    CheckCircle,
    AlertCircle,
    Loader2,
    ExternalLink,
} from 'lucide-react'
import { saveAiSettings, getAiSettings } from '@/modules/playground/actions/ai-settings'
import type { AiProviderType } from '@/lib/ai-providers'
import { simplifyAiErrorMessage } from '@/lib/ai-error'
import Link from 'next/link'

// Define the props for the AiSettingsModal component
interface AiSettingsModalProps {
    isOpen: boolean
    onClose: () => void
}

// Define the supported AI providers and their configurations
const PROVIDERS: {
    value: AiProviderType
    label: string
    requiresKey: boolean
    requiresUrl: boolean
    keyLabel: string
    keyPlaceholder: string
    docsUrl: string
    description: string
}[] = [
    {
        value: 'OLLAMA_LOCAL',
        label: 'Ollama (Local)',
        requiresKey: false,
        requiresUrl: false,
        keyLabel: '',
        keyPlaceholder: '',
        docsUrl: 'https://ollama.com',
        description: 'Runs on your machine at localhost:11434. Works only in local development.',
    },
    {
        value: 'OLLAMA_REMOTE',
        label: 'Ollama (Remote)',
        requiresKey: true,
        requiresUrl: true,
        keyLabel: 'Bearer Token (optional)',
        keyPlaceholder: 'Bearer token if your server requires auth',
        docsUrl: 'https://ollama.com/blog/openai-compatibility',
        description:
            'Your own Ollama server (e.g. a VPS, ngrok tunnel, or RunPod). Works in deployment.',
    },
    {
        value: 'OPENAI',
        label: 'OpenAI',
        requiresKey: true,
        requiresUrl: false,
        keyLabel: 'API Key',
        keyPlaceholder: 'sk-...',
        docsUrl: 'https://platform.openai.com/api-keys',
        description: 'GPT-4o mini by default. Fast, cost-effective, great for code.',
    },
    {
        value: 'GEMINI',
        label: 'Google Gemini',
        requiresKey: true,
        requiresUrl: false,
        keyLabel: 'API Key',
        keyPlaceholder: 'AIza...',
        docsUrl: 'https://aistudio.google.com/app/apikey',
        description: 'Gemini 1.5 Flash by default. Free tier available via Google AI Studio.',
    },
    {
        value: 'ANTHROPIC',
        label: 'Anthropic Claude',
        requiresKey: true,
        requiresUrl: false,
        keyLabel: 'API Key',
        keyPlaceholder: 'sk-ant-...',
        docsUrl: 'https://console.anthropic.com/keys',
        description: 'Claude 3.5 Haiku by default. Excellent reasoning and code quality.',
    },
    {
        value: 'OPEN_ROUTER',
        label: 'OpenRouter',
        requiresKey: true,
        requiresUrl: false,
        keyLabel: 'API Key',
        keyPlaceholder: 'sk-or-...',
        docsUrl: 'https://openrouter.ai/keys',
        description: 'Access 200+ models (GPT, Claude, Gemini, Llama) via a single API key.',
    },
]

// Define the available models for each provider
const PROVIDER_MODELS: Record<
    AiProviderType,
    {
        value: string
        label: string
    }[]
> = {
    // this are my defaiult supported ai models for the ai models- local or cloud
    OLLAMA_LOCAL: [
        { value: 'qwen2.5-coder:7b', label: 'Qwen 2.5 Coder 7B (default)' },
        { value: 'qwen2.5-coder:3b', label: 'Qwen 2.5 Coder 3B (faster)' },
        { value: 'codellama:7b', label: 'CodeLlama 7B' },
        { value: 'llama3.1:8b', label: 'Llama 3.1 8B' },
        { value: 'deepseek-coder:6.7b', label: 'DeepSeek Coder 6.7B' },
    ],
    OLLAMA_REMOTE: [
        { value: 'qwen2.5-coder:7b', label: 'Qwen 2.5 Coder 7B (default)' },
        { value: 'qwen2.5-coder:3b', label: 'Qwen 2.5 Coder 3B' },
        { value: 'codellama:7b', label: 'CodeLlama 7B' },
        { value: 'llama3.1:8b', label: 'Llama 3.1 8B' },
    ],
    OPENAI: [
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini (default, fast)' },
        { value: 'gpt-4o', label: 'GPT-4o (best quality)' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (cheapest)' },
    ],
    GEMINI: [
        { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (default, free)' }, // ← MOVE TO TOP
        { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (fastest)' }, // ← optional add
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (best quality)' },
    ],
    ANTHROPIC: [
        { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (default, fast)' },
        { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (best quality)' },
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (most powerful)' },
    ],
    OPEN_ROUTER: [
        { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (default, fast)' },
        { value: 'openai/gpt-4o', label: 'GPT-4o (best quality)' },
        { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
        { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
        { value: 'meta-llama/llama-3.1-8b-instruct', label: 'Llama 3.1 8B (free)' },
        { value: 'deepseek/deepseek-chat-v3-0324', label: 'DeepSeek V3 (cheap)' },
    ],
}

// Main component for the AI Settings Modal
function AiSettingsModal({ isOpen, onClose }: AiSettingsModalProps) {
    const [selectedProvider, setSelectedProvider] = React.useState<AiProviderType>('OLLAMA_LOCAL')
    const [apiKey, setApiKey] = React.useState('')
    const [ollamaBaseUrl, setOllamaBaseUrl] = React.useState('')
    const [showKey, setShowKey] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)
    const [saveStatus, setSaveStatus] = React.useState<'idle' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = React.useState('')
    const [hasExistingKey, setHasExistingKey] = React.useState(false)
    const [selectedModel, setSelectedModel] = React.useState<string>('')
    const [testStatus, setTestStatus] = React.useState<'idle' | 'testing' | 'success' | 'error'>(
        'idle',
    )
    const [testMessage, setTestMessage] = React.useState('')

    // Load existing settings when modal opens
    React.useEffect(() => {
        if (!isOpen) return
        setIsLoading(true)
        void getAiSettings().then((settings) => {
            if (settings?.provider) {
                setSelectedProvider(settings.provider)
                setHasExistingKey(settings.hasKey)
                if (settings.ollamaBaseUrl) setOllamaBaseUrl(settings.ollamaBaseUrl)
                if (settings.model) setSelectedModel(settings.model)
            }
            setIsLoading(false)
        })
    }, [isOpen])

    const currentProvider = PROVIDERS.find((p) => p.value === selectedProvider)!

    const handleSave = async () => {
        setSaveStatus('idle')
        setErrorMessage('')

        if (currentProvider.requiresKey && !apiKey.trim() && !hasExistingKey) {
            setErrorMessage(`API key is required for ${currentProvider.label}`)
            setSaveStatus('error')
            return
        }
        if (currentProvider.requiresUrl && !ollamaBaseUrl.trim()) {
            setErrorMessage('Base URL is required for remote Ollama')
            setSaveStatus('error')
            return
        }

        setIsSaving(true)
        const result = await saveAiSettings({
            provider: selectedProvider,
            apiKey: apiKey.trim() || undefined,
            ollamaBaseUrl: ollamaBaseUrl.trim() || undefined,
            model: selectedModel || undefined,
        })
        setIsSaving(false)

        if (result.success) {
            setSaveStatus('success')
            setApiKey('') // clear the field after saving
            setHasExistingKey(currentProvider.requiresKey || selectedProvider === 'OLLAMA_REMOTE')
            setTimeout(() => setSaveStatus('idle'), 3000)
            // auto-testing the connectionright after saving
            void testConnection()
        } else {
            setSaveStatus('error')
            setErrorMessage(result.error ?? 'Failed to save settings')
        }
    }

    if (!isOpen) return null

    const testConnection = async () => {
        setTestStatus('testing')
        setTestMessage('')
        try {
            const res = await fetch('/api/ai-test', { method: 'POST' })
            const data = (await res.json()) as {
                ok: boolean
                model?: string
                provider?: string
                error?: string
            }
            if (data.ok) {
                setTestStatus('success')
                setTestMessage(`Connected — ${data.model ?? data.provider}`)
            } else {
                console.error('AI connection test failed:', data.error)
                setTestStatus('error')
                setTestMessage(simplifyAiErrorMessage(data.error, 'Connection failed'))
            }
        } catch (error) {
            console.error('AI connection test request failed:', error)
            setTestStatus('error')
            setTestMessage(simplifyAiErrorMessage(error, 'Could not reach the server'))
        }
    }

    // Render the modal dialog with provider selection, API key input, and status messages
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
            role="dialog"
            aria-modal="true"
            aria-label="AI Provider Settings"
        >
            <div className="relative mx-4 flex w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[#1e2028] bg-[#0c1117] text-[#c9d4e5] shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#1e2028] px-4 py-3">
                    <div className="flex items-center gap-2">
                        <Settings size={16} className="text-[#00d4aa]" />
                        <span className="text-[13px] font-semibold text-white">
                            AI Provider Settings
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded p-1 text-[#6a7280] hover:bg-[#11161d] hover:text-white"
                        aria-label="Close settings"
                    >
                        ✕
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={20} className="animate-spin text-[#00d4aa]" />
                    </div>
                ) : (
                    <div
                        className="max-h-[70vh] overflow-y-auto px-4 py-3"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#2a3443 #0f141b' }}
                    >
                        <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                            <div className="space-y-3 md:sticky md:top-0 md:self-start">
                                <p className="text-[11px] uppercase tracking-wider text-[#6a7280]">
                                    Choose Provider
                                </p>
                                <div className="grid grid-cols-1 gap-2">
                                    {PROVIDERS.map((provider) => (
                                        <button
                                            key={provider.value}
                                            type="button"
                                            onClick={() => {
                                                setSelectedProvider(provider.value)
                                                setApiKey('')
                                                setHasExistingKey(false)
                                                setSaveStatus('idle')
                                                setErrorMessage('')
                                                setSelectedModel('')
                                            }}
                                            className={`flex flex-col rounded-lg border px-3 py-2.5 text-left transition-all duration-200 ease-out motion-safe:hover:-translate-y-0.5 ${
                                                selectedProvider === provider.value
                                                    ? 'border-[#00d4aa]/40 bg-[rgba(0,212,170,0.08)] text-white shadow-[0_0_0_1px_rgba(0,212,170,0.15)]'
                                                    : 'border-[#1e2028] bg-[#11161d] text-[#c9d4e5] hover:border-[#00d4aa]/20'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-[12px] font-medium">
                                                    {provider.label}
                                                </span>
                                                {selectedProvider === provider.value && (
                                                    <span className="rounded-full bg-[#00d4aa]/20 px-2 py-0.5 text-[10px] text-[#00d4aa]">
                                                        Selected
                                                    </span>
                                                )}
                                            </div>
                                            <span className="mt-1 text-[10px] text-[#6a7280]">
                                                {provider.description}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-lg border border-[#1e2028] bg-[#0f141b] p-3 transition-all duration-300 ease-out">
                                <div
                                    key={selectedProvider}
                                    className="space-y-4 transition-all duration-300 ease-out"
                                >
                                    {currentProvider.requiresUrl && (
                                        <div>
                                            <label className="mb-1.5 block text-[11px] text-[#9ab0be]">
                                                Ollama Server URL
                                                <a
                                                    href={currentProvider.docsUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="ml-2 inline-flex items-center gap-1 text-[#00d4aa] hover:underline"
                                                >
                                                    Docs <ExternalLink size={10} />
                                                </a>
                                            </label>
                                            <input
                                                type="url"
                                                value={ollamaBaseUrl}
                                                onChange={(e) => setOllamaBaseUrl(e.target.value)}
                                                placeholder="https://your-ollama-server.com"
                                                className="w-full rounded-lg border border-[#1e2028] bg-[#11161d] px-3 py-2 text-[12px] text-[#d6e1ef] outline-none placeholder:text-[#6a7280] transition-colors focus:border-[#00d4aa]/50"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="mb-1.5 block text-[11px] text-[#9ab0be]">
                                            Model
                                        </label>
                                        <select
                                            value={selectedModel}
                                            onChange={(e) => setSelectedModel(e.target.value)}
                                            className="w-full rounded-lg border border-[#1e2028] bg-[#11161d] px-3 py-2 text-[12px] text-[#d6e1ef] outline-none transition-colors focus:border-[#00d4aa]/50"
                                        >
                                            <option value="">Use default model</option>
                                            {PROVIDER_MODELS[selectedProvider].map((m) => (
                                                <option key={m.value} value={m.value}>
                                                    {m.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {(currentProvider.requiresKey ||
                                        currentProvider.value === 'OLLAMA_REMOTE') && (
                                        <div>
                                            <label className="mb-1.5 block text-[11px] text-[#9ab0be]">
                                                {currentProvider.keyLabel}
                                                <a
                                                    href={currentProvider.docsUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="ml-2 inline-flex items-center gap-1 text-[#00d4aa] hover:underline"
                                                >
                                                    Get key <ExternalLink size={10} />
                                                </a>
                                            </label>
                                            {hasExistingKey && !apiKey && (
                                                <p className="mb-1.5 text-[11px] text-[#00d4aa]">
                                                    ✓ A key is already saved. Enter a new one to
                                                    replace it.
                                                </p>
                                            )}
                                            <div className="relative">
                                                <input
                                                    type={showKey ? 'text' : 'password'}
                                                    value={apiKey}
                                                    onChange={(e) => setApiKey(e.target.value)}
                                                    placeholder={
                                                        hasExistingKey
                                                            ? '••••••••••••••••'
                                                            : currentProvider.keyPlaceholder
                                                    }
                                                    autoComplete="off"
                                                    className="w-full rounded-lg border border-[#1e2028] bg-[#11161d] px-3 py-2 pr-9 text-[12px] text-[#d6e1ef] outline-none placeholder:text-[#6a7280] transition-colors focus:border-[#00d4aa]/50"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowKey((v) => !v)}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6a7280] hover:text-white"
                                                    aria-label={showKey ? 'Hide key' : 'Show key'}
                                                >
                                                    {showKey ? (
                                                        <EyeOff size={14} />
                                                    ) : (
                                                        <Eye size={14} />
                                                    )}
                                                </button>
                                            </div>
                                            <p className="mt-1.5 text-[10px] text-[#6a7280]">
                                                Your key is encrypted with AES-256-GCM before
                                                storage and never exposed in API responses.
                                            </p>
                                        </div>
                                    )}

                                    {currentProvider.value === 'OLLAMA_LOCAL' && (
                                        <div className="rounded-lg border border-[#1e2028] bg-[#11161d] px-4 py-3 text-[11px] text-[#9ab0be] transition-all duration-200">
                                            <p className="font-medium text-[#c9d4e5]">
                                                Setup checklist
                                            </p>
                                            <ol className="mt-2 list-inside list-decimal space-y-1">
                                                <li>
                                                    Install Ollama from{' '}
                                                    <a
                                                        href="https://ollama.com"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[#00d4aa] hover:underline"
                                                    >
                                                        ollama.com
                                                    </a>
                                                </li>
                                                <li>
                                                    Run:{' '}
                                                    <code className="rounded bg-[#1e2028] px-1">
                                                        ollama pull qwen2.5-coder:7b
                                                    </code>
                                                </li>
                                                <li>
                                                    Set{' '}
                                                    <code className="rounded bg-[#1e2028] px-1">
                                                        OLLAMA_BASE_URL=http://localhost:11434
                                                    </code>{' '}
                                                    in your{' '}
                                                    <code className="rounded bg-[#1e2028] px-1">
                                                        .env
                                                    </code>
                                                </li>
                                            </ol>
                                            <p className="mt-2 text-[#6a7280]">
                                                ⚠ Local mode only works in development — not on
                                                deployed apps.
                                            </p>
                                        </div>
                                    )}

                                    {testStatus !== 'idle' && (
                                        <div
                                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] transition-all duration-200 ${
                                                testStatus === 'testing'
                                                    ? 'border-[#1e2028] bg-[#11161d] text-[#9ab0be]'
                                                    : testStatus === 'success'
                                                      ? 'border-[#0f4d40] bg-[rgba(0,212,170,0.08)] text-[#00d4aa]'
                                                      : 'border-red-900/40 bg-red-950/30 text-[#ef8d8d]'
                                            }`}
                                        >
                                            {testStatus === 'testing' && (
                                                <Loader2
                                                    size={13}
                                                    className="animate-spin shrink-0"
                                                />
                                            )}
                                            {testStatus === 'success' && (
                                                <CheckCircle size={13} className="shrink-0" />
                                            )}
                                            {testStatus === 'error' && (
                                                <AlertCircle size={13} className="shrink-0" />
                                            )}
                                            <span>
                                                {testStatus === 'testing'
                                                    ? 'Testing connection…'
                                                    : testStatus === 'success'
                                                      ? `✓ ${testMessage}`
                                                      : `✗ ${testMessage}`}
                                            </span>
                                        </div>
                                    )}

                                    {saveStatus === 'success' && (
                                        <div className="flex items-center gap-2 rounded-lg border border-[#0f4d40] bg-[rgba(0,212,170,0.08)] px-3 py-2 text-[12px] text-[#00d4aa] transition-all duration-200">
                                            <CheckCircle size={14} />
                                            Settings saved successfully!
                                        </div>
                                    )}
                                    {saveStatus === 'error' && (
                                        <div className="flex items-center gap-2 rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 text-[12px] text-[#ef8d8d] transition-all duration-200">
                                            <AlertCircle size={14} />
                                            {errorMessage}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 border-t border-[#1e2028] px-4 py-3">
                    <Link
                        href="/docs"
                        className="inline-flex items-center gap-1.5 text-[12px] text-[#9ab0be] transition-colors hover:text-white"
                    >
                        Setup docs <ExternalLink size={12} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-[#1e2028] bg-[#11161d] px-4 py-1.5 text-[12px] text-[#c9d4e5] transition-colors hover:border-[#00d4aa]/30 hover:text-white"
                        >
                            Cancel
                        </button>

                        {/* ← NEW: manual test button, only shows when a provider is already configured */}
                        {hasExistingKey && (
                            <button
                                type="button"
                                onClick={() => void testConnection()}
                                disabled={testStatus === 'testing' || isSaving}
                                className="flex items-center gap-1.5 rounded-lg border border-[#1e2028] bg-[#11161d] px-4 py-1.5 text-[12px] text-[#9ab0be] transition-colors hover:border-[#00d4aa]/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {testStatus === 'testing' ? (
                                    <>
                                        <Loader2 size={12} className="animate-spin" /> Testing…
                                    </>
                                ) : (
                                    'Test Connection'
                                )}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => void handleSave()}
                            disabled={isSaving || isLoading}
                            className="flex items-center gap-1.5 rounded-lg border border-[#0f4d40] bg-[#00d4aa] px-4 py-1.5 text-[12px] font-medium text-black transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 size={12} className="animate-spin" /> Saving...
                                </>
                            ) : (
                                'Save Settings'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AiSettingsModal
