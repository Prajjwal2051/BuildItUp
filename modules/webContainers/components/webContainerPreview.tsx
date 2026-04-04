// This component will be responsible for rendering the WebContainer preview, including the loading state, error handling, and displaying the server URL when available.

import React, { useEffect } from 'react'
import { TemplateFolder } from '@/modules/playground/lib/path-to-json'
import { WebContainer } from '@webcontainer/api'
import { CheckCircle, Loader2, SquareTerminal, XCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { transformToWebContainerFormat } from '../hooks/transformer'

const ANSI_ESCAPE_REGEX = /\u001b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g
const SPINNER_LINE_REGEX = /^[\\|\/-]{1,120}$/
type TerminalTone = 'info' | 'warn' | 'error' | 'success' | 'neutral'

// This removes terminal control characters so logs stay readable in the browser terminal panel.
function normalizeTerminalOutput(raw: string): string {
    const withoutAnsi = raw.replace(ANSI_ESCAPE_REGEX, '')
    const withoutBackspace = withoutAnsi.replace(/\u0008+/g, '')
    const withNormalizedLines = withoutBackspace.replace(/\r+/g, '\n')

    // Spinner frames are only visual in real terminals, so we drop those noise-only lines.
    const cleanedLines = withNormalizedLines
        .split('\n')
        .filter((line) => !SPINNER_LINE_REGEX.test(line.trim()))

    return cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n')
}

// Classifies log lines so users can quickly spot errors and warnings in the panel.
function getTerminalTone(line: string): TerminalTone {
    const normalized = line.trim().toLowerCase()
    if (!normalized) return 'neutral'
    if (normalized.includes('npm err') || normalized.includes('error') || normalized.startsWith('[error]')) return 'error'
    if (normalized.includes('warn') || normalized.startsWith('[warn]')) return 'warn'
    if (normalized.startsWith('[info]')) return 'info'
    if (normalized.startsWith('[ready]') || normalized.includes('added ') || normalized.includes('success')) return 'success'
    return 'neutral'
}

function getTerminalToneClass(tone: TerminalTone): string {
    if (tone === 'error') return 'text-red-400'
    if (tone === 'warn') return 'text-amber-400'
    if (tone === 'info') return 'text-sky-400'
    if (tone === 'success') return 'text-green-400'
    return 'text-foreground'
}

// Wraps async container operations so the UI does not stay in a loading state forever.
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | null = null
    try {
        return await Promise.race([
            promise,
            new Promise<never>((_, reject) => {
                timer = setTimeout(() => {
                    reject(new Error(`${label} timed out after ${timeoutMs / 1000}s`))
                }, timeoutMs)
            }),
        ])
    } finally {
        if (timer) {
            clearTimeout(timer)
        }
    }
}

// Picks the most reliable start command based on available package scripts.
function getStartCommandFromPackageJson(packageJsonText: string): string[] {
    try {
        const parsed = JSON.parse(packageJsonText) as { scripts?: Record<string, string> }
        const scripts = parsed.scripts ?? {}
        if (typeof scripts.dev === 'string' && scripts.dev.trim()) {
            return ['run', 'dev']
        }
        if (typeof scripts.start === 'string' && scripts.start.trim()) {
            return ['start']
        }
    } catch {
        // If package.json is malformed, we still fall back to npm start.
    }
    return ['start']
}

// Ensures preview URLs are absolute so iframe and new-tab links do not resolve to Next.js routes.
function normalizePreviewUrl(url: string): string {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return trimmedUrl
    if (/^https?:\/\//i.test(trimmedUrl)) return trimmedUrl
    if (trimmedUrl.startsWith('//')) return `https:${trimmedUrl}`
    if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/.*)?$/i.test(trimmedUrl)) {
        return `http://${trimmedUrl}`
    }
    return `https://${trimmedUrl}`
}

// Opens preview safely in a separate tab; falls back to iframe wrapper for connect-path URLs.
function openPreviewInNewTab(url: string): void {
    const resolvedUrl = (() => {
        try {
            return new URL(url, window.location.origin).toString()
        } catch {
            return url
        }
    })()

    const isConnectPath = /\/webcontainer\/connect\//.test(resolvedUrl)
    if (!isConnectPath) {
        window.open(resolvedUrl, '_blank', 'noopener,noreferrer')
        return
    }

    const previewTab = window.open('', '_blank', 'noopener,noreferrer')
    if (!previewTab) return

    previewTab.document.write(`<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Live Preview</title>
        <style>
            html, body { margin: 0; width: 100%; height: 100%; background: #0b0d11; }
            iframe { border: 0; width: 100%; height: 100%; display: block; }
        </style>
    </head>
    <body>
        <iframe src="${resolvedUrl.replace(/"/g, '&quot;')}" allow="clipboard-read; clipboard-write"></iframe>
    </body>
</html>`)
    previewTab.document.close()
}

interface WebContainerPreviewProps {
    // Define any props you want to pass to the WebContainerPreview component
    tempateData: typeof TemplateFolder // Replace 'any' with the actual type of your template data
    sercverUrl: string | null
    isLoading: boolean
    error: Error | null
    instance: WebContainer | null
    useWriteFileSync: (path: string, content: string) => Promise<void>
    destroy: () => void
    forceReSetup?: boolean
    onTerminalLog?: (message: string) => void
    showInternalTerminal?: boolean
}

// This component will handle the rendering of the WebContainer preview, including loading states and error handling.

function WebContainerPreview({
    // Destructure the props passed to the component
    tempateData,
    sercverUrl,
    isLoading,
    error,
    instance,
    useWriteFileSync,
    destroy,
    forceReSetup = false,
    onTerminalLog,
    showInternalTerminal = true,
}: WebContainerPreviewProps) {

    // State to manage the preview URL and loading state
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(sercverUrl)
    const [loadingState, setLoadingState] = React.useState({
        transforming: false,
        mounting: false,
        installingDependencies: false,
        starting: false,
        ready: false,
    })
    // Effect to handle the WebContainer setup and updates
    const [currentStep, setCurrentStep] = React.useState<number>(0)
    const totalSteps = 4
    const [setupError, setSetupError] = React.useState<Error | null>(null)
    const [isSetupComplete, setIsSetupComplete] = React.useState(false)
    const [isSetupInProgress, setIsSetupInProgress] = React.useState(false)
    const [isAwaitingServerReady, setIsAwaitingServerReady] = React.useState(false)
    const [isTerminalOpen, setIsTerminalOpen] = React.useState(false)
    const [terminalLogs, setTerminalLogs] = React.useState<string[]>([])
    const activeError = error || setupError
    const normalizedPreviewUrl = previewUrl ? normalizePreviewUrl(previewUrl) : null

    // This keeps terminal logs small and readable while still showing the latest output.
    const appendTerminalLog = React.useCallback((chunk: string | Uint8Array) => {
        const decodedText = typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk)
        const text = normalizeTerminalOutput(decodedText)
        if (!text) return
        onTerminalLog?.(text)
        setTerminalLogs((prev) => {
            const nextLogs = [...prev, text]
            return nextLogs.length > 300 ? nextLogs.slice(-300) : nextLogs
        })
    }, [onTerminalLog])

    // This maps setup phases to labels so users can see what the container is doing right now.
    const loadingSteps = [
        {
            key: 'transforming',
            label: 'Transforming template',
            done: loadingState.mounting || loadingState.installingDependencies || loadingState.starting || loadingState.ready,
            active: loadingState.transforming,
        },
        {
            key: 'mounting',
            label: 'Mounting files',
            done: loadingState.installingDependencies || loadingState.starting || loadingState.ready,
            active: loadingState.mounting,
        },
        {
            key: 'installingDependencies',
            label: 'Installing dependencies',
            done: loadingState.starting || loadingState.ready,
            active: loadingState.installingDependencies,
        },
        {
            key: 'starting',
            label: 'Starting dev server',
            done: loadingState.ready,
            active: loadingState.starting,
        },
    ]

    useEffect(() => {
        if (sercverUrl) {
            setPreviewUrl(normalizePreviewUrl(sercverUrl))
        }
    }, [sercverUrl])

    useEffect(() => {
        if (!instance) return
        const unsubscribe = instance.on("server-ready", (_port, url) => {
            setPreviewUrl(normalizePreviewUrl(url))
            setCurrentStep(4)
            setLoadingState((prev) => ({ ...prev, starting: false, ready: true }))
            appendTerminalLog(`[ready] Server started at ${url}\n`)
            setIsAwaitingServerReady(false)
            setIsSetupComplete(true)
        })

        return () => {
            unsubscribe()
        }
    }, [instance, appendTerminalLog])

    useEffect(() => {
        async function setUpContainer() {
            if (!instance || ((isSetupComplete || isAwaitingServerReady) && !forceReSetup) || isSetupInProgress) return
            try {
                setIsSetupInProgress(true)
                setSetupError(null)
                setTerminalLogs([])
                setIsAwaitingServerReady(false)

                // Step 1: Transform the template data and write it to the WebContainer file system
                setLoadingState((prev) => ({ ...prev, transforming: true }))
                setCurrentStep(1)
                //@ts-ignore
                const files = transformToWebContainerFormat(tempateData)
                setLoadingState((prev) => ({ ...prev, transforming: false, mounting: true }))
                setCurrentStep(2)

                await withTimeout(instance.mount(files), 20000, 'Mounting project files')

                // todo: terminal logic

                const nodeModulesExists = await instance.fs.readdir("/node_modules").then(() => true).catch(() => false)
                if (nodeModulesExists) {
                    appendTerminalLog('[info] Using cached node_modules. Skipping npm install.\n')
                }

                setLoadingState((prev) => ({ ...prev, mounting: false, installingDependencies: !nodeModulesExists }))
                setCurrentStep(3)

                // Step 3: Install dependencies
                if (!nodeModulesExists) {
                    const installProcess = await instance.spawn("npm", ["install"], {
                        cwd: "/",
                        env: {
                            ...process.env,
                            NODE_ENV: "development",
                        },
                    })

                    installProcess.output.pipeTo(new WritableStream({
                        write(data) {
                            // terminal logic here for install output
                            appendTerminalLog(data)
                        }
                    }))

                    const installExitCode = await installProcess.exit
                    if (installExitCode !== 0) {
                        throw new Error(`npm install failed with exit code ${installExitCode}`)
                    }
                }

                setLoadingState((prev) => ({ ...prev, installingDependencies: false, starting: true }))
                setCurrentStep(4)
                // Step 4: Start the development server
                const packageJsonRaw = await instance.fs.readFile('/package.json').catch(() => null)
                const packageJsonText = packageJsonRaw
                    ? (typeof packageJsonRaw === 'string' ? packageJsonRaw : new TextDecoder().decode(packageJsonRaw))
                    : '{}'
                const startCommand = getStartCommandFromPackageJson(packageJsonText)
                appendTerminalLog(`[info] Starting server with: npm ${startCommand.join(' ')}\n`)

                const startProcess = await instance.spawn("npm", startCommand, {
                    cwd: "/",
                    env: {
                        ...process.env,
                        NODE_ENV: "development",
                    },
                })

                startProcess.output.pipeTo(new WritableStream({
                    write(data) {
                        // terminal logic here for start output
                        appendTerminalLog(data)
                    }
                }))

                // Marks that setup is done and we are now only waiting for the running server signal.
                setIsAwaitingServerReady(true)

                void startProcess.exit.then((exitCode) => {
                    if (exitCode !== 0) {
                        setIsAwaitingServerReady(false)
                        setSetupError(new Error(`Dev server exited with code ${exitCode}`))
                        appendTerminalLog(`[error] Dev server exited with code ${exitCode}\n`)
                    }
                })

            } catch (error) {
                setSetupError(error as Error)
                setIsAwaitingServerReady(false)
                appendTerminalLog(`[error] ${(error as Error).message}\n`)
            } finally {
                setIsSetupInProgress(false)
            }
        }

        setUpContainer()
    }, [
        instance,
        tempateData,
        isSetupComplete,
        isAwaitingServerReady,
        isSetupInProgress,
        forceReSetup,
        appendTerminalLog,
    ])

    // This renders terminal logs in a scrollable panel so users can inspect setup/runtime output.
    function TerminalPanel() {
        return (
            <div className="w-full rounded-md border bg-muted/30">
                <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">Terminal Output</div>
                <ScrollArea className="h-44 w-full">
                    <pre className="whitespace-pre-wrap wrap-break-word p-3 text-xs text-foreground">
                        {terminalLogs.length > 0
                            ? terminalLogs.join('').split('\n').map((line, index) => (
                                <span key={`${index}-${line.slice(0, 24)}`} className={getTerminalToneClass(getTerminalTone(line))}>
                                    {line}
                                    {'\n'}
                                </span>
                            ))
                            : 'No logs yet.'}
                    </pre>
                </ScrollArea>
            </div>
        )
    }

    function TerminalToggleButton() {
        return (
            <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Toggle terminal logs"
                title="Toggle terminal logs"
                onClick={() => setIsTerminalOpen((prev) => !prev)}
            >
                <SquareTerminal size={16} />
            </Button>
        )
    }

    if (isLoading || isSetupInProgress || isAwaitingServerReady) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
                {showInternalTerminal ? (
                    <div className="flex w-full max-w-xl justify-end">
                        <TerminalToggleButton />
                    </div>
                ) : null}
                <Loader2 className="animate-spin text-muted-foreground" size={40} />
                <p className="text-lg font-medium">Setting up WebContainer...</p>
                <div className="w-full max-w-xl space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Step {Math.min(currentStep, totalSteps)} / {totalSteps}
                    </p>
                    <Progress value={(currentStep / totalSteps) * 100} className="w-full" />
                    <div className="space-y-2">
                        {loadingSteps.map((step) => (
                            <div key={step.key} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                                <span>{step.label}</span>
                                {step.done ? (
                                    <CheckCircle className="text-green-500" size={16} />
                                ) : step.active ? (
                                    <Loader2 className="animate-spin text-muted-foreground" size={16} />
                                ) : (
                                    <span className="text-muted-foreground">Pending</span>
                                )}
                            </div>
                        ))}
                    </div>
                    {isAwaitingServerReady ? (
                        <p className="text-xs text-muted-foreground">Waiting for preview server to become ready...</p>
                    ) : null}
                </div>
                {showInternalTerminal && isTerminalOpen ? <TerminalPanel /> : null}
            </div>
        )
    }

    if (activeError) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                {showInternalTerminal ? (
                    <div className="flex w-full max-w-2xl justify-end">
                        <TerminalToggleButton />
                    </div>
                ) : null}
                <XCircle size={48} className="text-red-500" />
                <p className="text-lg font-medium">Failed to set up WebContainer</p>
                <p className="max-w-2xl text-sm text-muted-foreground">{activeError.message}</p>
                <button
                    type="button"
                    onClick={destroy}
                    className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
                >
                    Reset Container
                </button>
                {showInternalTerminal && isTerminalOpen ? <TerminalPanel /> : null}
            </div>
        )
    }

    if (previewUrl) {
        return (
            <div className="flex h-full flex-col gap-3 p-3">
                <div className="h-full min-h-100 overflow-hidden rounded-md border bg-background">
                    <iframe
                        src={normalizedPreviewUrl ?? undefined}
                        title="WebContainer Preview"
                        className="h-full w-full"
                        sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                        onLoad={() => appendTerminalLog('[info] Preview iframe loaded.\n')}
                    />
                </div>

                {showInternalTerminal && isTerminalOpen ? <TerminalPanel /> : null}
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
            {showInternalTerminal ? <TerminalToggleButton /> : null}
            <span>Waiting for WebContainer instance...</span>
            {showInternalTerminal && isTerminalOpen ? <TerminalPanel /> : null}
        </div>
    )

}

export default WebContainerPreview