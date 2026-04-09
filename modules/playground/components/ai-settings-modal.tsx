'use client'

import React from 'react'
import { Settings, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import { saveAiSettings, getAiSettings } from '@/modules/playground/actions/ai-settings'
import type { AiProviderType } from '@/lib/ai-providers'

const PROVIDERS: { value: AiProviderType; label: string; requiresKey: boolean; requiresUrl: boolean; keyLabel: string; keyPlaceholder: string; docsUrl: string; description: string }[] = [
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
        requiresKey: false,
        requiresUrl: true,
        keyLabel: 'Bearer Token (optional)',
        keyPlaceholder: 'Bearer token if your server requires auth',
        docsUrl: 'https://ollama.com/blog/openai-compatibility',
        description: 'Your own Ollama server (e.g. a VPS, ngrok tunnel, or RunPod). Works in deployment.',
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
]

interface AiSettingsModalProps {
    isOpen: boolean
    onClose: () => void
}

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

    // Load existing settings when modal opens
    React.useEffect(() => {
        if (!isOpen) return
        setIsLoading(true)
        void getAiSettings().then((settings) => {
            if (settings?.provider) {
                setSelectedProvider(settings.provider)
                setHasExistingKey(settings.hasKey)
                if (settings.ollamaBaseUrl) setOllamaBaseUrl(settings.ollamaBaseUrl)
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
        })
        setIsSaving(false)

        if (result.success) {
            setSaveStatus('success')
            setApiKey('') // clear the field after saving
            setHasExistingKey(currentProvider.requiresKey || selectedProvider === 'OLLAMA_REMOTE')
            setTimeout(() => setSaveStatus('idle'), 3000)
        } else {
            setSaveStatus('error')
            setErrorMessage(result.error ?? 'Failed to save settings')
        }
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
            role="dialog"
            aria-modal="true"
            aria-label="AI Provider Settings"
        >
            <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[#1e2028] bg-[#0c1117] text-[#c9d4e5] shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#1e2028] px-5 py-4">
                    <div className="flex items-center gap-2">
                        <Settings size={16} className="text-[#00d4aa]" />
                        <span className="text-[13px] font-semibold text-white">AI Provider Settings</span>
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
                    <div className="overflow-y-auto px-5 py-4">
                        {/* Provider selector */}
                        <p className="mb-3 text-[11px] uppercase tracking-wider text-[#6a7280]">Choose Provider</p>
                        <div className="mb-5 grid grid-cols-1 gap-2">
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
                                    }}
                                    className={`flex flex-col rounded-lg border px-4 py-3 text-left transition-colors ${
                                        selectedProvider === provider.value
                                            ? 'border-[#00d4aa]/40 bg-[rgba(0,212,170,0.08)] text-white'
                                            : 'border-[#1e2028] bg-[#11161d] text-[#c9d4e5] hover:border-[#00d4aa]/20'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-[13px] font-medium">{provider.label}</span>
                                        {selectedProvider === provider.value && (
                                            <span className="rounded-full bg-[#00d4aa]/20 px-2 py-0.5 text-[10px] text-[#00d4aa]">Selected</span>
                                        )}
                                    </div>
                                    <span className="mt-1 text-[11px] text-[#6a7280]">{provider.description}</span>
                                </button>
                            ))}
                        </div>

                        {/* Ollama Base URL (only for OLLAMA_REMOTE) */}
                        {currentProvider.requiresUrl && (
                            <div className="mb-4">
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
                                    className="w-full rounded-lg border border-[#1e2028] bg-[#11161d] px-3 py-2 text-[12px] text-[#d6e1ef] outline-none placeholder:text-[#6a7280] focus:border-[#00d4aa]/50"
                                />
                            </div>
                        )}

                        {/* API Key input */}
                        {(currentProvider.requiresKey || currentProvider.value === 'OLLAMA_REMOTE') && (
                            <div className="mb-4">
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
                                        ✓ A key is already saved. Enter a new one to replace it.
                                    </p>
                                )}
                                <div className="relative">
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder={hasExistingKey ? '••••••••••••••••' : currentProvider.keyPlaceholder}
                                        autoComplete="off"
                                        className="w-full rounded-lg border border-[#1e2028] bg-[#11161d] px-3 py-2 pr-9 text-[12px] text-[#d6e1ef] outline-none placeholder:text-[#6a7280] focus:border-[#00d4aa]/50"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKey((v) => !v)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6a7280] hover:text-white"
                                        aria-label={showKey ? 'Hide key' : 'Show key'}
                                    >
                                        {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                                <p className="mt-1.5 text-[10px] text-[#6a7280]">
                                    Your key is encrypted with AES-256-GCM before storage and never exposed in API responses.
                                </p>
                            </div>
                        )}

                        {/* Local Ollama info */}
                        {currentProvider.value === 'OLLAMA_LOCAL' && (
                            <div className="mb-4 rounded-lg border border-[#1e2028] bg-[#11161d] px-4 py-3 text-[11px] text-[#9ab0be]">
                                <p className="font-medium text-[#c9d4e5]">Setup checklist</p>
                                <ol className="mt-2 list-inside list-decimal space-y-1">
                                    <li>Install Ollama from <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-[#00d4aa] hover:underline">ollama.com</a></li>
                                    <li>Run: <code className="rounded bg-[#1e2028] px-1">ollama pull qwen2.5-coder:7b</code></li>
                                    <li>Set <code className="rounded bg-[#1e2028] px-1">OLLAMA_BASE_URL=http://localhost:11434</code> in your <code className="rounded bg-[#1e2028] px-1">.env</code></li>
                                </ol>
                                <p className="mt-2 text-[#6a7280]">⚠ Local mode only works in development — not on deployed apps.</p>
                            </div>
                        )}

                        {/* Status messages */}
                        {saveStatus === 'success' && (
                            <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#0f4d40] bg-[rgba(0,212,170,0.08)] px-3 py-2 text-[12px] text-[#00d4aa]">
                                <CheckCircle size={14} />
                                Settings saved successfully!
                            </div>
                        )}
                        {saveStatus === 'error' && (
                            <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 text-[12px] text-[#ef8d8d]">
                                <AlertCircle size={14} />
                                {errorMessage}
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 border-t border-[#1e2028] px-5 py-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-[#1e2028] bg-[#11161d] px-4 py-1.5 text-[12px] text-[#c9d4e5] transition-colors hover:border-[#00d4aa]/30 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={isSaving || isLoading}
                        className="flex items-center gap-1.5 rounded-lg border border-[#0f4d40] bg-[#00d4aa] px-4 py-1.5 text-[12px] font-medium text-black transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? <><Loader2 size={12} className="animate-spin" /> Saving...</> : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AiSettingsModal
