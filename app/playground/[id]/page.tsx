'use client'
// This page renders one playground workspace with explorer, editor, preview, and terminal.

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { SidebarInset } from '@/components/ui/sidebar'
import TemplateFileTree from '@/modules/playground/components/playground-explorer'
import usePlayground from '@/modules/playground/hooks/usePlayground'
import type { FileTreeNode } from '@/modules/playground/lib/path-to-json'
import { cn } from '@/lib/utils'
import Editor from '@monaco-editor/react'
import type { Monaco } from '@monaco-editor/react'
import type { editor as MonacoEditor } from 'monaco-editor'
import {
    configureMonaco,
    defaultEditorOptions,
    getEditorLanguage,
} from '@/modules/playground/lib/editor-config'
import useWebContainer from '@/modules/webContainers/hooks/useWebContainer'
import WebContainerPreview from '@/modules/webContainers/components/webContainerPreview'
import PlaygroundTerminal from '@/modules/playground/components/playground-terminal'
import ToggleAi from '@/modules/playground/components/toggle-ai'
import PlaygroundAiSidebar from '@/modules/playground/components/playground-ai-sidebar'
import useAISuggestion from '@/modules/playground/hooks/useAISuggestion'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    TerminalSquare,
    X,
    GripHorizontal,
    House,
    Settings,
    ArrowLeftRight,
    Search,
} from 'lucide-react'
import useFileExplorerStore, { type OpenFile } from '@/modules/playground/hooks/useFileExplorer'

// Clones the full tree so updates remain immutable.
function cloneTree(node: FileTreeNode): FileTreeNode {
    return {
        ...node,
        children: node.children?.map(cloneTree),
    }
}

// Builds child paths using the root-dot format used by template payloads.
function toChildPath(parentPath: string, childName: string): string {
    return parentPath === '.' ? childName : `${parentPath}/${childName}`
}

// Recomputes tree paths after edits so all nodes stay addressable.
function rebuildPaths(node: FileTreeNode, path = '.'): FileTreeNode {
    const nextNode: FileTreeNode = { ...node, path }
    if (nextNode.type === 'directory') {
        const children = nextNode.children ?? []
        nextNode.children = children.map((child) => {
            const childPath = toChildPath(path, child.name)
            return rebuildPaths(child, childPath)
        })
    }
    return nextNode
}

// Finds a node by path so we can open specific files after load or click.
function findNodeByPath(node: FileTreeNode, targetPath: string): FileTreeNode | null {
    if (node.path === targetPath) {
        return node
    }
    if (node.type !== 'directory') {
        return null
    }

    for (const child of node.children ?? []) {
        const found = findNodeByPath(child, targetPath)
        if (found) {
            return found
        }
    }

    return null
}

// Returns the first file path in the tree so the editor starts with visible content.
function findFirstFilePath(node: FileTreeNode): string {
    if (node.type === 'file') return node.path
    for (const child of node.children ?? []) {
        const first = findFirstFilePath(child)
        if (first) return first
    }
    return ''
}

// Updates a node in place by path and reports whether a match was found.
function updateNodeByPath(
    node: FileTreeNode,
    targetPath: string,
    update: (target: FileTreeNode) => void,
): boolean {
    if (node.path === targetPath) {
        update(node)
        return true
    }
    if (node.type !== 'directory' || !node.children) return false
    return node.children.some((child) => updateNodeByPath(child, targetPath, update))
}

function getFileName(filePath: string): string {
    return filePath.includes('/') ? filePath.slice(filePath.lastIndexOf('/') + 1) : filePath
}

// Collects all files from the tree so search can match by name/path.
function collectFileNodes(node: FileTreeNode | null, acc: FileTreeNode[] = []): FileTreeNode[] {
    if (!node) return acc
    if (node.type === 'file') {
        acc.push(node)
        return acc
    }

    for (const child of node.children ?? []) {
        collectFileNodes(child, acc)
    }

    return acc
}

type RuntimeTemplateItem = {
    filename: string
    fileExtension: string
    content: string
    folderName?: string
    items?: RuntimeTemplateItem[]
}

type RuntimeTemplate = {
    folderName: string
    items: RuntimeTemplateItem[]
}

// Converts the explorer tree into the shape expected by WebContainer preview.
function toRuntimeTemplate(tree: FileTreeNode | null): RuntimeTemplate | null {
    if (!tree || tree.type !== 'directory') return null

    function toItem(node: FileTreeNode): RuntimeTemplateItem {
        if (node.type === 'directory') {
            return {
                filename: '',
                fileExtension: '',
                content: '',
                folderName: node.name,
                items: (node.children ?? []).map(toItem),
            }
        }

        const dotIndex = node.name.lastIndexOf('.')
        const hasExtension = dotIndex > 0
        const filename = hasExtension ? node.name.slice(0, dotIndex) : node.name
        const fileExtension = hasExtension ? node.name.slice(dotIndex + 1) : ''

        return {
            filename,
            fileExtension,
            content: node.content ?? '',
        }
    }

    return {
        folderName: tree.name,
        items: (tree.children ?? []).map(toItem),
    }
}

type EditorPreferences = {
    theme: 'dark' | 'light'
    fontSize: number
    fontFamily: string
}

const EDITOR_PREFERENCES_STORAGE_KEY = 'playground-editor-preferences'
const SPLIT_EDITOR_STORAGE_KEY = 'playground-split-preferences'
const SIDEBAR_WIDTH_STORAGE_KEY = 'playground-sidebar-width'
const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
    theme: 'dark',
    fontSize: 14,
    fontFamily: 'JetBrains Mono, Fira Code, Menlo, Monaco, monospace',
}

const EDITOR_FONT_FAMILY_OPTIONS = [
    { label: 'JetBrains Mono', value: 'JetBrains Mono, Fira Code, Menlo, Monaco, monospace' },
    { label: 'Fira Code', value: 'Fira Code, JetBrains Mono, Menlo, Monaco, monospace' },
    { label: 'Source Code Pro', value: 'Source Code Pro, Menlo, Monaco, monospace' },
    { label: 'Menlo', value: 'Menlo, Monaco, Consolas, monospace' },
]

type SplitPreferences = {
    isOpen: boolean
    filePath: string
}

// Reads persisted preferences and guards against malformed storage values.
function parseEditorPreferences(raw: string | null): EditorPreferences {
    if (!raw) return DEFAULT_EDITOR_PREFERENCES

    try {
        const parsed = JSON.parse(raw) as Partial<EditorPreferences>
        const theme = parsed.theme === 'light' ? 'light' : 'dark'
        const fontSize =
            typeof parsed.fontSize === 'number'
                ? Math.min(28, Math.max(11, Math.round(parsed.fontSize)))
                : DEFAULT_EDITOR_PREFERENCES.fontSize
        const fontFamily =
            typeof parsed.fontFamily === 'string' && parsed.fontFamily.trim().length > 0
                ? parsed.fontFamily
                : DEFAULT_EDITOR_PREFERENCES.fontFamily

        return { theme, fontSize, fontFamily }
    } catch {
        return DEFAULT_EDITOR_PREFERENCES
    }
}

// Renders open tabs and save actions for the current editor state.
function OpenFilesTabs({
    openFiles,
    activeFilePath,
    onSelect,
    onClose,
    onSave,
    onSaveAll,
}: {
    openFiles: OpenFile[]
    activeFilePath: string
    onSelect: (file: OpenFile) => void
    onClose: (path: string) => void
    onSave: () => void
    onSaveAll: () => void
}) {
    if (openFiles.length === 0) return null
    const hasUnsaved = openFiles.some((file) => file.hasUnsavedChanges)

    return (
        <div className="flex items-center border-b border-[#1c1f26] bg-[#0f1115]">
            <div className="flex flex-1 items-center overflow-x-auto scrollbar-none">
                {openFiles.map((file) => {
                    const isActive = file.id === activeFilePath
                    const isDirty = file.hasUnsavedChanges
                    return (
                        <div
                            key={file.id}
                            onClick={() => onSelect(file)}
                            className={cn(
                                'group flex shrink-0 cursor-pointer select-none items-center gap-2 border-r border-[#1c1f26] px-4 py-2 font-mono text-[12px] transition-colors',
                                isActive
                                    ? 'border-t-2 border-t-[#61afef] bg-[#141821] text-white'
                                    : 'text-[#5c6370] hover:bg-[#151922] hover:text-[#aab1bf]',
                            )}
                        >
                            {isDirty ? (
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#e5c07b]" />
                            ) : null}
                            <span>{getFileName(file.id)}</span>
                            <button
                                onClick={(event) => {
                                    event.stopPropagation()
                                    onClose(file.id)
                                }}
                                className={cn(
                                    'flex h-4 w-4 items-center justify-center rounded text-[11px] transition-colors',
                                    isActive
                                        ? 'text-[#5c6370] hover:bg-[#2a2f3a] hover:text-white'
                                        : 'text-[#5c6370] opacity-0 hover:bg-[#2a2f3a] hover:text-white group-hover:opacity-100',
                                )}
                            >
                                x
                            </button>
                        </div>
                    )
                })}
            </div>

            <div className="flex shrink-0 items-center gap-1 border-l border-[#1c1f26] px-2">
                <button
                    onClick={onSave}
                    title="Save (Ctrl+S)"
                    disabled={!activeFilePath || !hasUnsaved}
                    className={cn(
                        'flex h-7 w-7 items-center justify-center rounded transition-colors',
                        activeFilePath && hasUnsaved
                            ? 'text-[#aab1bf] hover:bg-[#1b2130] hover:text-white'
                            : 'cursor-not-allowed text-[#3a3f4b]',
                    )}
                >
                    S
                </button>

                <button
                    onClick={onSaveAll}
                    title="Save All (Ctrl+Shift+S)"
                    disabled={!hasUnsaved}
                    className={cn(
                        'flex h-7 w-7 items-center justify-center rounded transition-colors',
                        hasUnsaved
                            ? 'text-[#aab1bf] hover:bg-[#1b2130] hover:text-white'
                            : 'cursor-not-allowed text-[#3a3f4b]',
                    )}
                >
                    A
                </button>
            </div>
        </div>
    )
}

// Renders the full playground shell and keeps editor state in sync with persistence and preview.
function MainPlaygroundPage() {
    const params = useParams<{ id?: string | string[] }>()
    const router = useRouter()
    const { setTheme } = useTheme()
    const id = Array.isArray(params.id) ? (params.id[0] ?? '') : (params.id ?? '')
    const { playgroundData, templateData, isLoading, error, saveTemplateData } = usePlayground(id)

    const [isTerminalOpen, setIsTerminalOpen] = React.useState(false)
    const [terminalHeight, setTerminalHeight] = React.useState(220)
    const [isPreviewOpen, setIsPreviewOpen] = React.useState(true)
    const [isSplitEditorOpen, setIsSplitEditorOpen] = React.useState(false)
    const [splitFilePath, setSplitFilePath] = React.useState('')
    const [terminalLogs, setTerminalLogs] = React.useState<string[]>([])
    const [isSettingsDialogOpen, setIsSettingsDialogOpen] = React.useState(false)
    const [isSearchDialogOpen, setIsSearchDialogOpen] = React.useState(false)
    const [isAiAutocompleteEnabled, setIsAiAutocompleteEnabled] = React.useState(true)
    const [isAiChatOpen, setIsAiChatOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState('')
    const [isNavigatingHome, setIsNavigatingHome] = React.useState(false)
    const [editorPreferences, setEditorPreferences] = React.useState<EditorPreferences>(
        DEFAULT_EDITOR_PREFERENCES,
    )
    const [sidebarWidth, setSidebarWidth] = React.useState(300)
    const editorInstanceRef = React.useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
    const monacoInstanceRef = React.useRef<Monaco | null>(null)
    const inlineProviderRef = React.useRef<{ dispose: () => void } | null>(null)
    const inlineWidgetRef = React.useRef<MonacoEditor.IContentWidget | null>(null)
    const inlineWidgetNodeRef = React.useRef<HTMLDivElement | null>(null)
    const liveSyncTimersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
    const isResizingSidebarRef = React.useRef(false)

    const fileTree = useFileExplorerStore((state) => state.fileTree)
    const openFiles = useFileExplorerStore((state) => state.openFiles)
    const activeFilePath = useFileExplorerStore((state) => state.activeFileId ?? '')
    const setPlaygroundId = useFileExplorerStore((state) => state.setPlaygroundId)
    const setTemplateFileTree = useFileExplorerStore((state) => state.setTemplateFileTree)
    const setActiveFileId = useFileExplorerStore((state) => state.setActiveFileId)
    const openFile = useFileExplorerStore((state) => state.openFile)
    const closeFile = useFileExplorerStore((state) => state.closeFile)
    const closeAllFiles = useFileExplorerStore((state) => state.closeAllFiles)
    const markFileAsUnsaved = useFileExplorerStore((state) => state.markFileAsUnsaved)
    const saveFileChanges = useFileExplorerStore((state) => state.saveFileChanges)
    const addFile = useFileExplorerStore((state) => state.addFile)
    const addFolder = useFileExplorerStore((state) => state.addFolder)
    const deleteFile = useFileExplorerStore((state) => state.deleteFile)
    const deleteFolder = useFileExplorerStore((state) => state.deleteFolder)
    const renameFile = useFileExplorerStore((state) => state.renameFile)
    const renameFolder = useFileExplorerStore((state) => state.renameFolder)

    const runtimeTemplate = React.useMemo(() => toRuntimeTemplate(fileTree), [fileTree])
    const fileSearchItems = React.useMemo(() => collectFileNodes(fileTree), [fileTree])
    const activeOpenFile = React.useMemo(
        () => openFiles.find((file) => file.id === activeFilePath) ?? null,
        [activeFilePath, openFiles],
    )
    const splitOpenFile = React.useMemo(
        () => openFiles.find((file) => file.id === splitFilePath) ?? null,
        [openFiles, splitFilePath],
    )
    const activeEditorContent = activeOpenFile?.content ?? ''
    const splitEditorContent = splitOpenFile?.content ?? ''
    const activePathSegments = React.useMemo(
        () => activeFilePath.split('/').filter(Boolean),
        [activeFilePath],
    )
    const splitPathSegments = React.useMemo(
        () => splitFilePath.split('/').filter(Boolean),
        [splitFilePath],
    )
    const filteredSearchItems = React.useMemo(() => {
        const normalized = searchQuery.trim().toLowerCase()
        if (!normalized) return fileSearchItems.slice(0, 100)

        return fileSearchItems
            .filter((file) => `${file.name} ${file.path}`.toLowerCase().includes(normalized))
            .slice(0, 100)
    }, [fileSearchItems, searchQuery])
    const monacoTheme = editorPreferences.theme === 'light' ? 'vs' : 'modern-dark'
    const aiSuggestion = useAISuggestion({ enabled: isAiAutocompleteEnabled })
    const {
        suggestion: aiInlineSuggestion,
        isLoading: aiSuggestionLoading,
        error: aiSuggestionError,
        fetchSuggestion: fetchAiSuggestion,
        clearSuggestion: clearAiSuggestion,
    } = aiSuggestion
    const editorOptions = React.useMemo(
        () => ({
            ...(defaultEditorOptions as unknown as MonacoEditor.IStandaloneEditorConstructionOptions),
            automaticLayout: true,
            fontSize: editorPreferences.fontSize,
            fontFamily: editorPreferences.fontFamily,
            quickSuggestions: isAiAutocompleteEnabled,
            suggestOnTriggerCharacters: isAiAutocompleteEnabled,
            inlineSuggest: {
                enabled: isAiAutocompleteEnabled,
            },
        }),
        [editorPreferences.fontFamily, editorPreferences.fontSize, isAiAutocompleteEnabled],
    )

    const {
        serverUrl,
        isLoading: isWebContainerLoading,
        error: webContainerError,
        instance,
        useWriteFileSync,
        destroy,
    } = useWebContainer({
        templateData: templateData as never,
    })

    const playgroundTitle =
        (typeof playgroundData?.title === 'string' && playgroundData.title.trim()) ||
        (typeof templateData?.name === 'string' && templateData.name.trim()) ||
        'Untitled Playground'

    // Loads the current template tree into the file explorer store and opens the first file.
    React.useEffect(() => {
        setPlaygroundId(id)
        if (!templateData) {
            setTemplateFileTree(null)
            closeAllFiles()
            return
        }

        const normalizedTree = rebuildPaths(cloneTree(templateData), '.')
        setTemplateFileTree(normalizedTree)
        closeAllFiles()

        const firstFilePath = findFirstFilePath(normalizedTree)
        const firstFile = firstFilePath ? findNodeByPath(normalizedTree, firstFilePath) : null
        if (firstFile && firstFile.type === 'file') {
            openFile(firstFile)
        }
    }, [closeAllFiles, id, openFile, setPlaygroundId, setTemplateFileTree, templateData])

    // Restores persisted editor preferences on first client render.
    React.useEffect(() => {
        const stored = window.localStorage.getItem(EDITOR_PREFERENCES_STORAGE_KEY)
        setEditorPreferences(parseEditorPreferences(stored))

        const storedSidebarWidth = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY)
        if (storedSidebarWidth) {
            const nextWidth = Number(storedSidebarWidth)
            if (Number.isFinite(nextWidth)) {
                setSidebarWidth(Math.max(220, Math.min(520, nextWidth)))
            }
        }

        const splitStored = window.localStorage.getItem(SPLIT_EDITOR_STORAGE_KEY)
        if (splitStored) {
            try {
                const parsed = JSON.parse(splitStored) as Partial<SplitPreferences>
                setIsSplitEditorOpen(Boolean(parsed.isOpen))
                setSplitFilePath(typeof parsed.filePath === 'string' ? parsed.filePath : '')
            } catch {
                setIsSplitEditorOpen(false)
                setSplitFilePath('')
            }
        }
    }, [])

    // Persists preferences and applies app theme whenever settings change.
    React.useEffect(() => {
        window.localStorage.setItem(
            EDITOR_PREFERENCES_STORAGE_KEY,
            JSON.stringify(editorPreferences),
        )
        setTheme(editorPreferences.theme)
        editorInstanceRef.current?.layout()
    }, [editorPreferences, setTheme])

    // Persists split pane preferences so the editor reopens in the same mode.
    React.useEffect(() => {
        const payload: SplitPreferences = {
            isOpen: isSplitEditorOpen,
            filePath: splitFilePath,
        }
        window.localStorage.setItem(SPLIT_EDITOR_STORAGE_KEY, JSON.stringify(payload))
    }, [isSplitEditorOpen, splitFilePath])

    React.useEffect(() => {
        window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth))
    }, [sidebarWidth])

    // Updates sidebar width while dragging the resize handle.
    React.useEffect(() => {
        function onMouseMove(event: MouseEvent) {
            if (!isResizingSidebarRef.current) return
            const nextWidth = Math.max(220, Math.min(520, event.clientX))
            setSidebarWidth(nextWidth)
        }

        function onMouseUp() {
            isResizingSidebarRef.current = false
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }

        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
        return () => {
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', onMouseUp)
        }
    }, [])

    // Clears pending live-sync timers when the component unmounts.
    React.useEffect(() => {
        return () => {
            for (const timer of liveSyncTimersRef.current.values()) {
                clearTimeout(timer)
            }
            liveSyncTimersRef.current.clear()
        }
    }, [])

    // Keeps split editor selection valid when active/open files change.
    React.useEffect(() => {
        if (!isSplitEditorOpen) return
        if (openFiles.length === 0) {
            setSplitFilePath('')
            return
        }

        const splitStillOpen = openFiles.some((file) => file.id === splitFilePath)
        if (splitStillOpen) return

        const fallback = openFiles.find((file) => file.id !== activeFilePath) ?? openFiles[0]
        if (fallback) {
            setSplitFilePath(fallback.id)
        }
    }, [activeFilePath, isSplitEditorOpen, openFiles, splitFilePath])

    // Re-layouts editor when workspace panels change dimensions.
    React.useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            editorInstanceRef.current?.layout()
        })
        return () => window.cancelAnimationFrame(frame)
    }, [isPreviewOpen, isSplitEditorOpen, isTerminalOpen, terminalHeight])

    // Saves the active file content back into the tree and clears dirty state for that file.
    const handleSave = React.useCallback(() => {
        if (!activeFilePath || !fileTree) return
        const activeFile = openFiles.find((file) => file.id === activeFilePath)
        if (!activeFile) return

        const draft = cloneTree(fileTree)
        updateNodeByPath(draft, activeFilePath, (target) => {
            target.content = activeFile.content
        })

        const rebuilt = rebuildPaths(draft, '.')
        setTemplateFileTree(rebuilt)
        void saveTemplateData(rebuilt)
        saveFileChanges(activeFilePath)
    }, [
        activeFilePath,
        fileTree,
        openFiles,
        saveFileChanges,
        saveTemplateData,
        setTemplateFileTree,
    ])

    // Saves all dirty tabs into the tree and persists the latest template snapshot.
    const handleSaveAll = React.useCallback(async () => {
        if (!fileTree) return

        const dirtyFiles = openFiles.filter((file) => file.hasUnsavedChanges)
        const draft = cloneTree(fileTree)
        for (const file of dirtyFiles) {
            updateNodeByPath(draft, file.id, (target) => {
                target.content = file.content
            })
        }

        const rebuilt = rebuildPaths(draft, '.')
        setTemplateFileTree(rebuilt)
        await saveTemplateData(rebuilt)
        dirtyFiles.forEach((file) => saveFileChanges(file.id))
    }, [fileTree, openFiles, saveFileChanges, saveTemplateData, setTemplateFileTree])

    // Saves current changes and then returns the user to dashboard.
    const handleNavigateDashboard = React.useCallback(async () => {
        if (isNavigatingHome) return
        setIsNavigatingHome(true)
        try {
            await handleSaveAll()
            router.push('/dashboard')
        } finally {
            setIsNavigatingHome(false)
        }
    }, [handleSaveAll, isNavigatingHome, router])

    React.useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            const isMod = event.ctrlKey || event.metaKey
            if (!isMod) return
            if (event.key === 's' || event.key === 'S') {
                event.preventDefault()
                if (event.shiftKey) {
                    void handleSaveAll()
                } else {
                    handleSave()
                }
                return
            }

            if (event.key.toLowerCase() === 'p') {
                event.preventDefault()
                setIsSearchDialogOpen(true)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [handleSave, handleSaveAll])

    // Adds terminal logs and keeps the log buffer bounded.
    const appendTerminalLog = React.useCallback((message: string) => {
        if (!message) return
        setTerminalLogs((previous) => {
            const next = [...previous, message]
            return next.length > 400 ? next.slice(-400) : next
        })
    }, [])

    // Syncs editor changes to store state and mirrors edits to WebContainer after debounce.
    const handleFileChange = React.useCallback(
        (filePath: string, newContent: string) => {
            markFileAsUnsaved(filePath, newContent)

            const previousTimer = liveSyncTimersRef.current.get(filePath)
            if (previousTimer) {
                clearTimeout(previousTimer)
            }

            const timer = setTimeout(() => {
                void useWriteFileSync(filePath, newContent)
                    .then(() => {
                        appendTerminalLog(
                            `[info] Synced ${getFileName(filePath)} to the live preview.\n`,
                        )
                    })
                    .catch((syncError) => {
                        const message =
                            syncError instanceof Error ? syncError.message : 'Unknown sync error'
                        appendTerminalLog(`[error] Failed to sync ${filePath}: ${message}\n`)
                    })
            }, 150)

            liveSyncTimersRef.current.set(filePath, timer)
        },
        [appendTerminalLog, markFileAsUnsaved, useWriteFileSync],
    )

    const handleFileSelect = React.useCallback(
        (filePath: string, file: FileTreeNode) => {
            if (file.type !== 'file') return
            openFile(file)
        },
        [openFile],
    )

    const handleTogglePreview = React.useCallback(() => {
        setIsPreviewOpen((previous) => !previous)
    }, [])

    const handleToggleTerminal = React.useCallback(() => {
        setIsTerminalOpen((previous) => !previous)
    }, [])

    const handleSidebarResizeStart = React.useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            event.preventDefault()
            isResizingSidebarRef.current = true
            document.body.style.cursor = 'col-resize'
            document.body.style.userSelect = 'none'
        },
        [],
    )

    const handleToggleSplitEditor = React.useCallback(() => {
        setIsSplitEditorOpen((previous) => {
            const next = !previous
            if (next) {
                const fallback =
                    openFiles.find((file) => file.id !== activeFilePath) ?? openFiles[0]
                if (fallback && !splitFilePath) {
                    setSplitFilePath(fallback.id)
                }
            }
            return next
        })
    }, [activeFilePath, openFiles, splitFilePath])

    const handleSwapSplitEditors = React.useCallback(() => {
        if (
            !isSplitEditorOpen ||
            !splitFilePath ||
            !activeFilePath ||
            splitFilePath === activeFilePath
        ) {
            return
        }

        const previousActive = activeFilePath
        setActiveFileId(splitFilePath)
        setSplitFilePath(previousActive)
    }, [activeFilePath, isSplitEditorOpen, setActiveFileId, splitFilePath])

    const handleOpenSearchResult = React.useCallback(
        (path: string) => {
            if (!fileTree) return
            const file = findNodeByPath(fileTree, path)
            if (!file || file.type !== 'file') return
            openFile(file)
            setIsSearchDialogOpen(false)
        },
        [fileTree, openFile],
    )

    // Executes a terminal command inside the current WebContainer and streams output.
    const handleTerminalCommand = React.useCallback(
        async (command: string) => {
            const normalized = command.trim()
            if (!normalized) return

            appendTerminalLog(`$ ${normalized}\n`)

            if (!instance) {
                appendTerminalLog('[warn] WebContainer is not ready yet.\n')
                return
            }

            const [binary, ...args] = normalized.split(/\s+/)
            try {
                const process = await instance.spawn(binary, args, { cwd: '/' })
                process.output.pipeTo(
                    new WritableStream({
                        write(data) {
                            appendTerminalLog(
                                typeof data === 'string' ? data : new TextDecoder().decode(data),
                            )
                        },
                    }),
                )

                const exitCode = await process.exit
                if (exitCode !== 0) {
                    appendTerminalLog(`[warn] Command exited with code ${exitCode}\n`)
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown command error'
                appendTerminalLog(`[error] ${message}\n`)
            }
        },
        [appendTerminalLog, instance],
    )

    const handleCopyTerminalLogs = React.useCallback(async () => {
        const combinedLogs = terminalLogs.join('')
        if (!combinedLogs) {
            appendTerminalLog('[info] No terminal logs to copy.\n')
            return
        }

        try {
            await navigator.clipboard.writeText(combinedLogs)
            appendTerminalLog('[info] Terminal logs copied to clipboard.\n')
        } catch {
            appendTerminalLog('[warn] Unable to copy terminal logs.\n')
        }
    }, [appendTerminalLog, terminalLogs])

    // Handles dragging to resize the terminal panel height.
    const handleTerminalResizeStart = React.useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            event.preventDefault()
            const startY = event.clientY
            const startHeight = terminalHeight

            function onMouseMove(moveEvent: MouseEvent) {
                const deltaY = startY - moveEvent.clientY
                const nextHeight = Math.max(140, Math.min(420, startHeight + deltaY))
                setTerminalHeight(nextHeight)
            }

            function onMouseUp() {
                window.removeEventListener('mousemove', onMouseMove)
                window.removeEventListener('mouseup', onMouseUp)
            }

            window.addEventListener('mousemove', onMouseMove)
            window.addEventListener('mouseup', onMouseUp)
        },
        [terminalHeight],
    )

    const handleEditorMount = React.useCallback(
        (editor: MonacoEditor.IStandaloneCodeEditor, monaco: Monaco) => {
            editorInstanceRef.current = editor
            monacoInstanceRef.current = monaco
            configureMonaco(monaco)
        },
        [],
    )

    // Triggers Monaco inline suggestions so ghost text appears at the cursor.
    const handleRequestAiSuggestion = React.useCallback(() => {
        const editor = editorInstanceRef.current
        if (!editor || !isAiAutocompleteEnabled) return
        editor.focus()
        editor.trigger('ai-inline-trigger', 'editor.action.inlineSuggest.trigger', {})
    }, [isAiAutocompleteEnabled])

    // Commits the active inline suggestion into the document and tracks unsaved changes.
    const handleAcceptInlineSuggestion = React.useCallback(() => {
        const editor = editorInstanceRef.current
        if (!editor || !activeFilePath) return

        editor.focus()
        editor.trigger('ai-inline-accept', 'editor.action.inlineSuggest.commit', {})

        const latestContent = editor.getModel()?.getValue() ?? ''
        markFileAsUnsaved(activeFilePath, latestContent)
        clearAiSuggestion()
    }, [activeFilePath, clearAiSuggestion, markFileAsUnsaved])

    // Inserts explicit AI output at cursor for chat sidebar actions.
    const handleInsertAiText = React.useCallback(
        (text: string) => {
            const editor = editorInstanceRef.current
            if (!editor || !activeFilePath || !text.trim()) return

            const position = editor.getPosition()
            if (!position) return

            editor.executeEdits('ai-chat-insert', [
                {
                    range: {
                        startLineNumber: position.lineNumber,
                        startColumn: position.column,
                        endLineNumber: position.lineNumber,
                        endColumn: position.column,
                    },
                    text,
                    forceMoveMarkers: true,
                },
            ])

            const latestContent = editor.getModel()?.getValue() ?? ''
            markFileAsUnsaved(activeFilePath, latestContent)
        },
        [activeFilePath, markFileAsUnsaved],
    )

    const handleToggleAiAutocomplete = React.useCallback(
        (enabled: boolean) => {
            setIsAiAutocompleteEnabled(enabled)
            if (!enabled) {
                clearAiSuggestion()
                const editor = editorInstanceRef.current
                editor?.trigger('ai-inline-hide', 'editor.action.inlineSuggest.hide', {})
            }
        },
        [clearAiSuggestion],
    )

    // Registers inline completions so Monaco renders AI output as grey ghost text.
    React.useEffect(() => {
        const editor = editorInstanceRef.current
        const monaco = monacoInstanceRef.current
        if (!editor || !monaco) return

        inlineProviderRef.current?.dispose()

        const currentLanguage = getEditorLanguage(activeFilePath.split('.').pop() ?? '')
        const provider = monaco.languages.registerInlineCompletionsProvider(currentLanguage, {
            provideInlineCompletions: async (
                model: any,
                position: any,
                _context: any,
                token: any,
            ) => {
                if (!isAiAutocompleteEnabled) {
                    return { items: [] }
                }

                if (editor.getModel() !== model) {
                    return { items: [] }
                }

                const selection = editor.getSelection()
                const hasSelection = Boolean(selection && !selection.isEmpty())
                const selectedText = hasSelection ? model.getValueInRange(selection!) : ''

                const nextSuggestion = await fetchAiSuggestion({
                    fileName: activeFilePath,
                    fileContent: model.getValue(),
                    cursorLine: Math.max(0, position.lineNumber - 1),
                    cursorColumn: Math.max(0, position.column - 1),
                    selectionStartLine: hasSelection ? selection!.startLineNumber - 1 : undefined,
                    selectionStartColumn: hasSelection ? selection!.startColumn - 1 : undefined,
                    selectionEndLine: hasSelection ? selection!.endLineNumber - 1 : undefined,
                    selectionEndColumn: hasSelection ? selection!.endColumn - 1 : undefined,
                    selectedText: hasSelection ? selectedText : undefined,
                })

                if (token.isCancellationRequested || !nextSuggestion.trim()) {
                    return { items: [] }
                }

                const replaceRange = hasSelection
                    ? new monaco.Range(
                        selection!.startLineNumber,
                        selection!.startColumn,
                        selection!.endLineNumber,
                        selection!.endColumn,
                    )
                    : new monaco.Range(
                        position.lineNumber,
                        position.column,
                        position.lineNumber,
                        position.column,
                    )

                return {
                    items: [
                        {
                            insertText: nextSuggestion,
                            range: replaceRange,
                        },
                    ],
                }
            },
            freeInlineCompletions: () => {
                // Monaco manages inline completion lifecycles internally.
            },
        })

        inlineProviderRef.current = provider
        return () => {
            provider.dispose()
            if (inlineProviderRef.current === provider) {
                inlineProviderRef.current = null
            }
        }
    }, [activeFilePath, fetchAiSuggestion, isAiAutocompleteEnabled])

    // Renders an inline button near the cursor so suggestion acceptance stays inside the editor.
    React.useEffect(() => {
        const editor = editorInstanceRef.current
        const monaco = monacoInstanceRef.current
        if (!editor || !monaco) return

        const widgetNode = document.createElement('div')
        const acceptButton = document.createElement('button')
        acceptButton.type = 'button'
        acceptButton.textContent = 'Accept AI'
        acceptButton.className =
            'rounded border border-[#3a4150] bg-[#1b2130] px-2 py-1 text-[10px] text-[#dbe8ff]'
        acceptButton.onclick = (event) => {
            event.preventDefault()
            handleAcceptInlineSuggestion()
        }

        widgetNode.style.display = 'none'
        widgetNode.style.pointerEvents = 'auto'
        widgetNode.appendChild(acceptButton)

        const widget: MonacoEditor.IContentWidget = {
            allowEditorOverflow: true,
            suppressMouseDown: false,
            getId: () => 'ai-inline-accept-widget',
            getDomNode: () => widgetNode,
            getPosition: () => {
                if (!isAiAutocompleteEnabled || !aiInlineSuggestion) {
                    return null
                }

                const position = editor.getPosition()
                if (!position) {
                    return null
                }

                return {
                    position,
                    preference: [monaco.editor.ContentWidgetPositionPreference.BELOW],
                }
            },
        }

        inlineWidgetNodeRef.current = widgetNode
        inlineWidgetRef.current = widget
        editor.addContentWidget(widget)

        const cursorListener = editor.onDidChangeCursorPosition(() => {
            editor.layoutContentWidget(widget)
        })

        return () => {
            cursorListener.dispose()
            editor.removeContentWidget(widget)
            if (inlineWidgetRef.current === widget) {
                inlineWidgetRef.current = null
                inlineWidgetNodeRef.current = null
            }
        }
    }, [aiInlineSuggestion, handleAcceptInlineSuggestion, isAiAutocompleteEnabled])

    React.useEffect(() => {
        const editor = editorInstanceRef.current
        const widget = inlineWidgetRef.current
        const widgetNode = inlineWidgetNodeRef.current
        if (!editor || !widget || !widgetNode) return

        const shouldShow = isAiAutocompleteEnabled && Boolean(aiInlineSuggestion)
        widgetNode.style.display = shouldShow ? 'block' : 'none'
        editor.layoutContentWidget(widget)
    }, [aiInlineSuggestion, isAiAutocompleteEnabled])

    const handleAddFile = React.useCallback(
        (parentPath: string, filename: string, extension: string) => {
            addFile(parentPath, filename, extension)
        },
        [addFile],
    )

    const handleAddFolder = React.useCallback(
        (parentPath: string, folderName: string) => {
            addFolder(parentPath, folderName)
        },
        [addFolder],
    )

    const handleDeleteFile = React.useCallback(
        (filePath: string) => {
            deleteFile(filePath)
        },
        [deleteFile],
    )

    const handleDeleteFolder = React.useCallback(
        (folderPath: string) => {
            deleteFolder(folderPath)
        },
        [deleteFolder],
    )

    const handleRenameFile = React.useCallback(
        (filePath: string, filename: string, extension: string) => {
            renameFile(filePath, filename, extension)
        },
        [renameFile],
    )

    const handleRenameFolder = React.useCallback(
        (folderPath: string, newFolderName: string) => {
            renameFolder(folderPath, newFolderName)
        },
        [renameFolder],
    )

    if (isLoading && !fileTree) {
        return (
            <SidebarInset>
                <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
                    Loading playground...
                </div>
            </SidebarInset>
        )
    }

    if (error && !fileTree) {
        return (
            <SidebarInset>
                <div className="flex min-h-[40vh] items-center justify-center text-sm text-destructive">
                    {error}
                </div>
            </SidebarInset>
        )
    }

    return (
        <div className="flex h-screen w-full overflow-hidden">
            {fileTree ? (
                <TemplateFileTree
                    data={fileTree}
                    onFileSelect={handleFileSelect}
                    selectedFilePath={activeFilePath}
                    title="File Explorer"
                    sidebarWidth={sidebarWidth}
                    onResizeStart={handleSidebarResizeStart}
                    onAddFile={handleAddFile}
                    onAddFolder={handleAddFolder}
                    onDeleteFile={handleDeleteFile}
                    onDeleteFolder={handleDeleteFolder}
                    onRenameFile={handleRenameFile}
                    onRenameFolder={handleRenameFolder}
                />
            ) : null}

            <SidebarInset className="relative flex flex-1 flex-col overflow-hidden">
                <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
                    <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
                        <DialogHeader className="border-b px-4 py-3">
                            <DialogTitle>Search files</DialogTitle>
                            <DialogDescription>
                                Find files by name or path and open them quickly.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="border-b px-4 py-3">
                            <Input
                                autoFocus
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Type a file name or path..."
                            />
                        </div>

                        <ScrollArea className="max-h-[60vh]">
                            <div className="space-y-2 p-3">
                                {filteredSearchItems.length > 0 ? (
                                    filteredSearchItems.map((file) => (
                                        <button
                                            key={file.path}
                                            type="button"
                                            onClick={() => handleOpenSearchResult(file.path)}
                                            className="w-full rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-muted/50"
                                        >
                                            <div className="truncate text-sm font-medium text-foreground">
                                                {file.path}
                                            </div>
                                            <div className="truncate text-xs text-muted-foreground">
                                                {file.name}
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="py-10 text-center text-sm text-muted-foreground">
                                        No matching files found.
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>

                <div className="flex shrink-0 items-center justify-between border-b border-[#1c1f26] bg-[#0f1115] px-4 py-2">
                    <div className="w-24" />
                    <div className="flex w-2xl items-center justify-center gap-2 rounded-md border border-[#2a2f3a] bg-[#141821] px-3 py-1">
                        <span className="select-none text-[11px] font-semibold uppercase tracking-widest text-[#5c6370]">
                            Playground
                        </span>
                        <span className="font-mono text-[13px] font-medium text-[#aab1bf]">
                            {playgroundTitle}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                void handleNavigateDashboard()
                            }}
                            title="Save all and go to dashboard"
                            disabled={isNavigatingHome}
                            className={cn(
                                'flex h-9 w-9 items-center justify-center rounded-md border transition-colors',
                                isNavigatingHome
                                    ? 'cursor-not-allowed border-[#2a2f3a] bg-[#141821] text-[#5c6370]'
                                    : 'border-[#2a2f3a] bg-[#141821] text-[#8b92a3] hover:border-[#3a4150] hover:text-white',
                            )}
                        >
                            <House size={16} />
                        </button>

                        <button
                            type="button"
                            onClick={handleTogglePreview}
                            title={isPreviewOpen ? 'Hide Preview' : 'Show Preview'}
                            className={cn(
                                'rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                                isPreviewOpen
                                    ? 'border-[#61afef] bg-[#1b2130] text-[#dbe8ff]'
                                    : 'border-[#2a2f3a] bg-[#141821] text-[#8b92a3] hover:border-[#3a4150] hover:text-white',
                            )}
                        >
                            Preview
                        </button>

                        <button
                            type="button"
                            onClick={handleToggleTerminal}
                            title={isTerminalOpen ? 'Hide Terminal' : 'Show Terminal'}
                            className={cn(
                                'flex h-9 w-9 items-center justify-center rounded-md border transition-colors',
                                isTerminalOpen
                                    ? 'border-[#61afef] bg-[#1b2130] text-[#dbe8ff]'
                                    : 'border-[#2a2f3a] bg-[#141821] text-[#8b92a3] hover:border-[#3a4150] hover:text-white',
                            )}
                        >
                            <TerminalSquare size={16} />
                        </button>
                    </div>
                </div>

                <OpenFilesTabs
                    openFiles={openFiles}
                    activeFilePath={activeFilePath}
                    onSelect={openFile}
                    onClose={closeFile}
                    onSave={handleSave}
                    onSaveAll={() => {
                        void handleSaveAll()
                    }}
                />

                <div className="flex min-h-0 flex-1 overflow-hidden bg-[#0f1115]">
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                        <div
                            className={cn(
                                'min-h-0 flex-1',
                                runtimeTemplate ? 'flex flex-row' : 'flex flex-col',
                            )}
                        >
                            <div
                                className={cn(
                                    'min-h-0 flex flex-1 overflow-hidden',
                                    isSplitEditorOpen ? 'flex-row' : 'flex-col',
                                )}
                            >
                                <div
                                    className={cn(
                                        'min-h-0 min-w-0 flex flex-1 flex-col overflow-hidden',
                                        isSplitEditorOpen ? 'border-r border-[#1c1f26]' : '',
                                    )}
                                >
                                    <div className="flex h-10 min-h-10 items-center justify-between border-b border-[#1c1f26] bg-[#0b0d11] px-3">
                                        <div className="flex items-center gap-2 text-[11px] text-[#5c6370]">
                                            <span>Editor</span>
                                            <span className="text-[#7d8596]">
                                                {activeOpenFile
                                                    ? getFileName(activeOpenFile.id)
                                                    : 'No file open'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {aiSuggestionError ? (
                                                <span className="max-w-60 truncate text-[10px] text-[#ef8d8d]">
                                                    {aiSuggestionError}
                                                </span>
                                            ) : null}

                                            <button
                                                type="button"
                                                onClick={handleRequestAiSuggestion}
                                                disabled={!isAiAutocompleteEnabled || aiSuggestionLoading}
                                                className="rounded border border-[#2a2f3a] px-2 py-1 text-[10px] text-[#8b92a3] transition-colors hover:border-[#3a4150] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                                title="Trigger inline AI suggestion"
                                            >
                                                {aiSuggestionLoading ? 'Thinking' : 'Trigger AI'}
                                            </button>

                                            <span className="text-[10px] text-[#5c6370]">Primary</span>
                                        </div>
                                    </div>

                                    <div className="flex h-8 min-h-8 items-center gap-1 overflow-hidden border-b border-[#1c1f26] bg-[#0d1016] px-3 text-[11px] text-[#6f7788]">
                                        <span className="shrink-0 text-[#5c6370]">Path:</span>
                                        {activePathSegments.length > 0 ? (
                                            activePathSegments.map((segment, index) => (
                                                <React.Fragment key={`${segment}-${index}`}>
                                                    {index > 0 ? (
                                                        <span className="text-[#4c5463]">/</span>
                                                    ) : null}
                                                    <span
                                                        className={cn(
                                                            'truncate',
                                                            index === activePathSegments.length - 1
                                                                ? 'text-[#aab1bf]'
                                                                : 'text-[#73809a]',
                                                        )}
                                                    >
                                                        {segment}
                                                    </span>
                                                </React.Fragment>
                                            ))
                                        ) : (
                                            <span className="text-[#5c6370]">No file selected</span>
                                        )}
                                    </div>

                                    <div className="min-h-0 flex-1 overflow-hidden">
                                        {activeOpenFile ? (
                                            <Editor
                                                path={activeFilePath}
                                                language={getEditorLanguage(
                                                    activeFilePath.split('.').pop() ?? '',
                                                )}
                                                value={activeEditorContent}
                                                onChange={(value) =>
                                                    handleFileChange(activeFilePath, value ?? '')
                                                }
                                                theme={monacoTheme}
                                                options={editorOptions}
                                                onMount={(editor, monaco) =>
                                                    handleEditorMount(editor, monaco)
                                                }
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-sm text-[#5c6370]">
                                                No file open
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {isSplitEditorOpen ? (
                                    <div className="min-h-0 min-w-0 flex flex-1 flex-col overflow-hidden">
                                        <div className="flex h-10 min-h-10 items-center justify-between border-b border-[#1c1f26] bg-[#0b0d11] px-3">
                                            <div className="flex items-center gap-2 text-[11px] text-[#5c6370]">
                                                <span>Split Editor</span>
                                                <span className="text-[#7d8596]">
                                                    Secondary view
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleSwapSplitEditors}
                                                    className="flex h-7 w-7 items-center justify-center rounded-md border border-[#2a2f3a] text-[#aab1bf] transition-colors hover:border-[#3a4150] hover:text-white"
                                                    title="Swap split panes"
                                                    aria-label="Swap split panes"
                                                >
                                                    <ArrowLeftRight size={13} />
                                                </button>
                                                <select
                                                    value={splitFilePath}
                                                    onChange={(event) =>
                                                        setSplitFilePath(event.target.value)
                                                    }
                                                    className="h-7 max-w-52 rounded-md border border-[#2a2f3a] bg-[#141821] px-2 text-[11px] text-[#aab1bf] outline-none"
                                                >
                                                    {openFiles.map((file) => (
                                                        <option key={file.id} value={file.id}>
                                                            {getFileName(file.id)}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsSplitEditorOpen(false)}
                                                    className="rounded border border-[#2a2f3a] px-2 py-1 text-[10px] text-[#8b92a3] transition-colors hover:border-[#3a4150] hover:text-white"
                                                >
                                                    Close
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex h-8 min-h-8 items-center gap-1 overflow-hidden border-b border-[#1c1f26] bg-[#0d1016] px-3 text-[11px] text-[#6f7788]">
                                            <span className="shrink-0 text-[#5c6370]">Path:</span>
                                            {splitPathSegments.length > 0 ? (
                                                splitPathSegments.map((segment, index) => (
                                                    <React.Fragment key={`${segment}-${index}`}>
                                                        {index > 0 ? (
                                                            <span className="text-[#4c5463]">
                                                                /
                                                            </span>
                                                        ) : null}
                                                        <span
                                                            className={cn(
                                                                'truncate',
                                                                index ===
                                                                    splitPathSegments.length - 1
                                                                    ? 'text-[#aab1bf]'
                                                                    : 'text-[#73809a]',
                                                            )}
                                                        >
                                                            {segment}
                                                        </span>
                                                    </React.Fragment>
                                                ))
                                            ) : (
                                                <span className="text-[#5c6370]">
                                                    No file selected
                                                </span>
                                            )}
                                        </div>

                                        <div className="min-h-0 flex-1 overflow-hidden">
                                            {splitOpenFile ? (
                                                <Editor
                                                    path={splitFilePath}
                                                    language={getEditorLanguage(
                                                        splitFilePath.split('.').pop() ?? '',
                                                    )}
                                                    value={splitEditorContent}
                                                    onChange={(value) =>
                                                        handleFileChange(splitFilePath, value ?? '')
                                                    }
                                                    theme={monacoTheme}
                                                    options={editorOptions}
                                                    onMount={(editor, monaco) =>
                                                        configureMonaco(monaco)
                                                    }
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-sm text-[#5c6370]">
                                                    Pick a file to open in the split view.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            {runtimeTemplate ? (
                                <div
                                    className={cn(
                                        'min-h-0 shrink-0 overflow-hidden bg-[#0f1115] transition-[width,border-color,opacity] duration-200',
                                        isPreviewOpen
                                            ? 'w-[45%] border-l border-[#1c1f26] opacity-100'
                                            : 'pointer-events-none w-0 border-l border-transparent opacity-0',
                                    )}
                                    aria-hidden={!isPreviewOpen}
                                >
                                    <WebContainerPreview
                                        tempateData={runtimeTemplate as never}
                                        sercverUrl={serverUrl}
                                        isLoading={isWebContainerLoading}
                                        error={webContainerError}
                                        instance={instance}
                                        useWriteFileSync={useWriteFileSync}
                                        destroy={destroy}
                                        onTerminalLog={appendTerminalLog}
                                        showInternalTerminal={false}
                                    />
                                </div>
                            ) : null}
                        </div>

                        <div className="flex items-center justify-between border-t border-[#1c1f26] bg-[#0b0d11] px-3 py-2">
                            <div className="flex items-center gap-2 text-[11px] text-[#5c6370]">
                                <span>Tools</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsSearchDialogOpen(true)}
                                    className="flex h-7 items-center gap-1.5 rounded-md border border-[#2a2f3a] bg-[#141821] px-2.5 text-[11px] text-[#aab1bf] transition-colors hover:border-[#3a4150] hover:text-white"
                                    title="Search files"
                                >
                                    <Search size={13} />
                                    <span>Search</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleToggleSplitEditor}
                                    className={cn(
                                        'flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11px] transition-colors',
                                        isSplitEditorOpen
                                            ? 'border-[#61afef] bg-[#1b2130] text-[#dbe8ff]'
                                            : 'border-[#2a2f3a] bg-[#141821] text-[#aab1bf] hover:border-[#3a4150] hover:text-white',
                                    )}
                                    title="Toggle split editor"
                                >
                                    <span>Split</span>
                                </button>

                                <ToggleAi
                                    isAiAutocompleteEnabled={isAiAutocompleteEnabled}
                                    isAiChatOpen={isAiChatOpen}
                                    onToggleAutocomplete={handleToggleAiAutocomplete}
                                    onOpenChat={() => setIsAiChatOpen(true)}
                                    onCloseChat={() => setIsAiChatOpen(false)}
                                />

                                <button
                                    type="button"
                                    onClick={() => setIsSettingsDialogOpen(true)}
                                    className="flex h-7 w-7 items-center justify-center rounded-md border border-[#2a2f3a] bg-[#141821] text-[#aab1bf] transition-colors hover:border-[#3a4150] hover:text-white"
                                    title="Editor settings"
                                    aria-label="Editor settings"
                                >
                                    <Settings size={13} />
                                </button>
                            </div>
                        </div>

                        <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Editor Settings</DialogTitle>
                                    <DialogDescription>
                                        Choose your preferred editor theme, font size, and font
                                        family.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 pt-1">
                                    <div className="space-y-2">
                                        <div className="text-sm font-medium">Theme</div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setEditorPreferences((previous) => ({
                                                        ...previous,
                                                        theme: 'dark',
                                                    }))
                                                }
                                                className={cn(
                                                    'h-8 rounded-md border px-3 text-xs transition-colors',
                                                    editorPreferences.theme === 'dark'
                                                        ? 'border-primary bg-primary/10 text-primary'
                                                        : 'border-border text-muted-foreground hover:text-foreground',
                                                )}
                                            >
                                                Dark
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setEditorPreferences((previous) => ({
                                                        ...previous,
                                                        theme: 'light',
                                                    }))
                                                }
                                                className={cn(
                                                    'h-8 rounded-md border px-3 text-xs transition-colors',
                                                    editorPreferences.theme === 'light'
                                                        ? 'border-primary bg-primary/10 text-primary'
                                                        : 'border-border text-muted-foreground hover:text-foreground',
                                                )}
                                            >
                                                Light
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm font-medium">
                                            <span>Font Size</span>
                                            <span className="text-xs text-muted-foreground">
                                                {editorPreferences.fontSize}px
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min={11}
                                            max={28}
                                            step={1}
                                            value={editorPreferences.fontSize}
                                            onChange={(event) => {
                                                const nextSize = Number(event.target.value)
                                                setEditorPreferences((previous) => ({
                                                    ...previous,
                                                    fontSize: nextSize,
                                                }))
                                            }}
                                            className="w-full"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-sm font-medium">Font Family</div>
                                        <select
                                            value={editorPreferences.fontFamily}
                                            onChange={(event) => {
                                                const nextFamily = event.target.value
                                                setEditorPreferences((previous) => ({
                                                    ...previous,
                                                    fontFamily: nextFamily,
                                                }))
                                            }}
                                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                        >
                                            {EDITOR_FONT_FAMILY_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        {isTerminalOpen ? (
                            <div
                                className="shrink-0 border-t border-[#1c1f26] bg-[#0b0d11]"
                                style={{ height: `${terminalHeight}px` }}
                            >
                                <button
                                    type="button"
                                    onMouseDown={handleTerminalResizeStart}
                                    className="flex h-3 w-full items-center justify-center text-[#5c6370] hover:text-[#aab1bf]"
                                    aria-label="Resize terminal"
                                    title="Drag to resize"
                                >
                                    <GripHorizontal size={14} />
                                </button>

                                <div className="flex items-center justify-between border-y border-[#1c1f26] px-3 py-2">
                                    <div className="flex items-center gap-2 text-[12px] text-[#aab1bf]">
                                        <TerminalSquare size={14} />
                                        <span className="font-medium">Terminal</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsTerminalOpen(false)}
                                        className="rounded p-1 text-[#71798a] hover:bg-[#151922] hover:text-white"
                                        aria-label="Close terminal"
                                        title="Close terminal"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-end border-b border-[#1c1f26] px-3 py-1.5">
                                    <button
                                        type="button"
                                        onClick={() => void handleCopyTerminalLogs()}
                                        className="rounded border border-[#2a2f3a] px-2 py-1 text-[10px] text-[#8b92a3] transition-colors hover:border-[#3a4150] hover:text-white"
                                    >
                                        Copy Logs
                                    </button>
                                </div>

                                <div className="h-[calc(100%-76px)] min-h-0 px-3 py-2 font-mono text-xs text-[#7d8596]">
                                    <PlaygroundTerminal
                                        logs={terminalLogs}
                                        className="h-full min-h-0"
                                        onCommand={handleTerminalCommand}
                                    />
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <PlaygroundAiSidebar
                        isOpen={isAiChatOpen}
                        onClose={() => setIsAiChatOpen(false)}
                        fileName={activeFilePath}
                        fileContent={activeEditorContent}
                        onInsertInEditor={handleInsertAiText}
                    />
                </div>
            </SidebarInset>
        </div>
    )
}

export default MainPlaygroundPage
