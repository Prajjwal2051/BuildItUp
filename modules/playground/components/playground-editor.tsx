'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react'
import type {
    CancellationToken,
    Position,
    editor as MonacoEditor,
    languages as MonacoLanguages,
} from 'monaco-editor'
import { SidebarInset } from '@/components/ui/sidebar'
import {
    FileCode2,
    File,
    Folder,
    Save,
    SplitSquareVertical,
    Bot,
    House,
    RotateCw,
    Maximize2,
    Minimize2,
    Search,
    Settings,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { configureMonaco, defaultEditorOptions, getEditorLanguage } from '@/modules/playground/lib/editor-config'
import { useCollaboration } from '@/hooks/use-collaboration'
import type { ServerMessage, TextOperations } from '@/CollabServer/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { diff_match_patch, DIFF_DELETE, DIFF_EQUAL, DIFF_INSERT } from 'diff-match-patch'
import { PresenceAvatars } from '@/modules/playground/components/presence-avatars'
import { apply } from '@/CollabServer/ot/engine'
import { toast } from 'sonner'
import PlaygroundAiSidebar from '@/modules/playground/components/playground-ai-sidebar'
import { normalizeTemplateTree } from '@/modules/playground/hooks/usePlayground'
import useAISuggestion from '@/modules/playground/hooks/useAISuggestion'
import ToggleAi from '@/modules/playground/components/toggle-ai'
import AiSettingsModal from '@/modules/playground/components/ai-settings-modal'
import { JoinNameGate } from './join-name-gate'
import { getAiSettings } from '@/modules/playground/actions/ai-settings'

type CollaborationConflict = Extract<ServerMessage, { type: 'conflict' }>

interface PlaygroundEditorProps {
    playgroundId: string
    collab?: { token: string }
}

type SharedFile = {
    path: string
    content: string
    language: string
}

type FileTreeNode = {
    name: string
    path: string
    type: 'folder' | 'directory' | 'file'
    children?: FileTreeNode[]
    content?: unknown
}

type RuntimeTemplateItem = {
    filename?: unknown
    fileExtension?: unknown
    content?: unknown
    folderName?: unknown
    items?: unknown
}

type RuntimeTemplateRoot = {
    folderName?: unknown
    items?: unknown
    content?: unknown
}

const PROVIDER_LABELS: Record<string, string> = {
    OLLAMA_LOCAL: 'Ollama Local',
    OLLAMA_REMOTE: 'Ollama Remote',
    OPENAI: 'OpenAI',
    GEMINI: 'Gemini',
    ANTHROPIC: 'Anthropic',
    OPEN_ROUTER: 'OpenRouter',
}

function normalizePath(pathLike: string): string {
    return pathLike.replace(/^\/+/, '').replace(/\\/g, '/').trim()
}

function toStringContent(value: unknown): string {
    if (typeof value === 'string') return value
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
}

function getNameInitials(name: string): string {
    const trimmed = name.trim()
    if (!trimmed) return 'U'
    const words = trimmed.split(/\s+/)
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
    return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function isTemplateTreeNode(value: unknown): value is FileTreeNode {
    if (!isRecord(value)) return false
    const type = value.type
    return (
        typeof value.name === 'string' &&
        typeof value.path === 'string' &&
        (type === 'file' || type === 'directory' || type === 'folder')
    )
}

function parseItemAsFile(item: unknown, index: number): SharedFile | null {
    if (!item || typeof item !== 'object') return null
    const record = item as Record<string, unknown>
    const rawPath =
        (typeof record.path === 'string' && record.path) ||
        (typeof record.filename === 'string' && record.filename) ||
        (typeof record.name === 'string' && record.name) ||
        `file-${index + 1}.txt`

    const path = normalizePath(rawPath)
    if (!path) return null

    const rawContent =
        (typeof record.content === 'string' && record.content) ||
        (typeof record.code === 'string' && record.code) ||
        (typeof record.text === 'string' && record.text) ||
        record.content ||
        record.code ||
        record.text ||
        ''

    const ext = path.split('.').pop() ?? ''
    return {
        path,
        content: toStringContent(rawContent),
        language: getEditorLanguage(ext),
    }
}

function walkTemplateTree(node: FileTreeNode, files: SharedFile[]): void {
    if (node.type === 'file') {
        const path = normalizePath(node.path || node.name || 'untitled.txt')
        if (!path) return

        const ext = path.split('.').pop() ?? ''
        files.push({
            path,
            content: toStringContent(node.content ?? ''),
            language: getEditorLanguage(ext),
        })
        return
    }

    for (const child of node.children ?? []) {
        walkTemplateTree(child, files)
    }
}

function walkRuntimeTemplate(item: RuntimeTemplateItem, parentPath: string, files: SharedFile[]): void {
    const folderName =
        typeof item.folderName === 'string' && item.folderName.trim() ? item.folderName.trim() : ''

    if (folderName) {
        const nextParent = parentPath ? `${parentPath}/${folderName}` : folderName
        const children = Array.isArray(item.items) ? item.items : []
        for (const child of children) {
            if (isRecord(child)) {
                walkRuntimeTemplate(child as RuntimeTemplateItem, nextParent, files)
            }
        }
        return
    }

    const filename = typeof item.filename === 'string' ? item.filename.trim() : ''
    const fileExtension =
        typeof item.fileExtension === 'string'
            ? item.fileExtension.trim().replace(/^\.+/, '')
            : ''

    if (!filename) return

    const finalName =
        fileExtension && !filename.toLowerCase().endsWith(`.${fileExtension.toLowerCase()}`)
            ? `${filename}.${fileExtension}`
            : filename
    const finalPath = normalizePath(parentPath ? `${parentPath}/${finalName}` : finalName)
    if (!finalPath) return

    const ext = finalPath.split('.').pop() ?? ''
    files.push({
        path: finalPath,
        content: toStringContent(item.content ?? ''),
        language: getEditorLanguage(ext),
    })
}

function maybeParseJsonString(value: string): unknown {
    let current: unknown = value

    for (let i = 0; i < 5; i += 1) {
        if (typeof current !== 'string') {
            return current
        }

        const text = current.trim()
        if (!text) return current

        const looksJson =
            text.startsWith('{') ||
            text.startsWith('[') ||
            text.startsWith('"{') ||
            text.startsWith('"[')

        if (!looksJson) return current

        try {
            current = JSON.parse(text)
        } catch {
            return current
        }
    }

    return current
}

function extractFilesFromUnknown(content: unknown): SharedFile[] {
    if (typeof content === 'string') {
        const parsed = maybeParseJsonString(content)
        if (parsed !== content) return extractFilesFromUnknown(parsed)
        return [{ path: 'main.ts', content, language: 'typescript' }]
    }

    if (Array.isArray(content)) {
        const files = content
            .map((item, index) => parseItemAsFile(item, index))
            .filter((file): file is SharedFile => file !== null)

        if (files.length > 0) return files
        return [{ path: 'main.json', content: JSON.stringify(content, null, 2), language: 'json' }]
    }

    if (isRecord(content)) {
        const runtimeRoot = isRecord(content.content) ? (content.content as RuntimeTemplateRoot) : (content as RuntimeTemplateRoot)
        if (Array.isArray(runtimeRoot.items)) {
            const runtimeFiles: SharedFile[] = []
            for (const child of runtimeRoot.items) {
                if (isRecord(child)) {
                    walkRuntimeTemplate(child as RuntimeTemplateItem, '', runtimeFiles)
                }
            }
            if (runtimeFiles.length > 0) return runtimeFiles
        }

        if (Array.isArray(content.items)) {
            const runtimeFiles: SharedFile[] = []
            for (const child of content.items) {
                if (isRecord(child)) {
                    walkRuntimeTemplate(child as RuntimeTemplateItem, '', runtimeFiles)
                }
            }
            if (runtimeFiles.length > 0) return runtimeFiles
        }

        if (isTemplateTreeNode(content)) {
            const files: SharedFile[] = []
            walkTemplateTree(content, files)
            if (files.length > 0) return files
        }

        const filesValue = 'files' in content ? (content as Record<string, unknown>).files : undefined
        if (Array.isArray(filesValue)) {
            const files = filesValue
                .map((item, index) => parseItemAsFile(item, index))
                .filter((file): file is SharedFile => file !== null)

            if (files.length > 0) return files
        }

        if (Array.isArray(content.children)) {
            const files = (content.children as unknown[])
                .filter(isTemplateTreeNode)
                .flatMap((node) => {
                    const extracted: SharedFile[] = []
                    walkTemplateTree(node, extracted)
                    return extracted
                })
            if (files.length > 0) return files
        }

        if (typeof filesValue === 'object' && filesValue && !Array.isArray(filesValue)) {
            const mapped = Object.entries(filesValue as Record<string, unknown>)
                .filter(([key]) => key.includes('.'))
                .map(([path, value]) => {
                    const normalized = normalizePath(path)
                    const ext = normalized.split('.').pop() ?? ''
                    return {
                        path: normalized,
                        content: toStringContent(value),
                        language: getEditorLanguage(ext),
                    }
                })
            if (mapped.length > 0) return mapped
        }

        if (content.content !== undefined) {
            const nested = extractFilesFromUnknown(content.content)
            if (nested.length > 0) return nested
        }

        if (typeof content.content === 'string') {
            return [{ path: 'main.txt', content: content.content, language: 'plaintext' }]
        }
    }

    return [{ path: 'main.txt', content: toStringContent(content), language: 'plaintext' }]
}

function serializeFiles(files: SharedFile[]): string {
    return JSON.stringify({
        files: files.map((file) => ({
            path: file.path,
            content: file.content,
        })),
    })
}

function buildFileTree(files: SharedFile[]): Array<{ name: string; path: string; type: 'folder' | 'file'; children?: Array<{ name: string; path: string; type: 'folder' | 'file'; children?: never[] }> }> {
    const root: { name: string; path: string; type: 'folder'; children: Array<{ name: string; path: string; type: 'folder' | 'file'; children?: any[] }> } = {
        name: 'root',
        path: '',
        type: 'folder',
        children: [],
    }

    for (const file of files) {
        const segments = file.path.split('/').filter(Boolean)
        let cursor = root
        let currentPath = ''

        for (let i = 0; i < segments.length; i += 1) {
            const segment = segments[i]
            const isFile = i === segments.length - 1
            currentPath = currentPath ? `${currentPath}/${segment}` : segment

            let child = cursor.children.find((entry) => entry.name === segment && entry.type === (isFile ? 'file' : 'folder'))
            if (!child) {
                child = {
                    name: segment,
                    path: currentPath,
                    type: isFile ? 'file' : 'folder',
                    children: isFile ? undefined : [],
                }
                cursor.children.push(child)
            }

            if (!isFile && child.children) {
                cursor = child as typeof root
            }
        }
    }

    const sortTree = (nodes: Array<{ name: string; path: string; type: 'folder' | 'file'; children?: any[] }>) => {
        nodes.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name)
            return a.type === 'folder' ? -1 : 1
        })
        for (const node of nodes) {
            if (node.children) sortTree(node.children)
        }
    }

    sortTree(root.children)
    return root.children as Array<{ name: string; path: string; type: 'folder' | 'file'; children?: Array<{ name: string; path: string; type: 'folder' | 'file'; children?: never[] }> }>
}

function buildOpsFromSerializedDiff(previous: string, next: string): TextOperations[] {
    if (previous === next) return []

    const dmp = new diff_match_patch()
    const diffs = dmp.diff_main(previous, next)
    dmp.diff_cleanupEfficiency(diffs)

    const ops: TextOperations[] = []
    let cursor = 0

    for (const [kind, text] of diffs) {
        if (!text) continue
        if (kind === DIFF_EQUAL) {
            cursor += text.length
            continue
        }
        if (kind === DIFF_DELETE) {
            ops.push({ type: 'delete', position: cursor, length: text.length })
            continue
        }
        if (kind === DIFF_INSERT) {
            ops.push({ type: 'insert', position: cursor, text })
            cursor += text.length
        }
    }

    return ops
}

export function PlaygroundEditor({ playgroundId, collab }: PlaygroundEditorProps) {
    const router = useRouter()
    const { data: session } = useSession()
    const ownerSessionName = session?.user?.name?.trim() || 'Owner'
    const [playgroundName, setPlaygroundName] = useState('Collaborative Playground')
    const [displayName, setDisplayName] = useState<string | null>(collab ? null : ownerSessionName)
    const [editor, setEditor] = useState<MonacoEditor.IStandaloneCodeEditor | null>(null)
    const [files, setFiles] = useState<SharedFile[]>([{ path: 'main.ts', content: '// Connecting collaborative session...', language: 'typescript' }])
    const [activePath, setActivePath] = useState<string>('main.ts')
    const [activeConflict, setActiveConflict] = useState<CollaborationConflict | null>(null)
    const [isSplitEditorOpen, setIsSplitEditorOpen] = useState(false)
    const [splitFilePath, setSplitFilePath] = useState('')
    const [isAiChatOpen, setIsAiChatOpen] = useState(false)
    const [isAiAutocompleteEnabled, setIsAiAutocompleteEnabled] = useState(true)
    const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false)
    const [activeAiProvider, setActiveAiProvider] = useState<string | null>(null)
    const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isSoftReloading, setIsSoftReloading] = useState(false)
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
    const [isDirty, setIsDirty] = useState(false)
    const [isDisplayNameDialogOpen, setIsDisplayNameDialogOpen] = useState(false)
    const [pendingDisplayName, setPendingDisplayName] = useState(ownerSessionName)
    const [isAddFileDialogOpen, setIsAddFileDialogOpen] = useState(false)
    const [pendingFilePath, setPendingFilePath] = useState('src/main.ts')
    const [isAddFolderDialogOpen, setIsAddFolderDialogOpen] = useState(false)
    const [pendingFolderPath, setPendingFolderPath] = useState('src/utils')

    const monacoRef = useRef<Monaco | null>(null)
    const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
    const inlineProviderRef = useRef<{ dispose: () => void } | null>(null)
    const decorationsRef = useRef<MonacoEditor.IEditorDecorationsCollection | null>(null)
    const widgetsRef = useRef<Map<string, MonacoEditor.IContentWidget>>(new Map())
    const isApplyingRemoteEditRef = useRef(false)
    const serializedDocRef = useRef<string>('')
    const filesRef = useRef<SharedFile[]>(files)
    const activePathRef = useRef<string>(activePath)
    const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const activeFile = files.find((file) => file.path === activePath) ?? files[0]
    const splitFile = files.find((file) => file.path === splitFilePath)
    const fileTree = useMemo(() => buildFileTree(files), [files])
    const {
        isLoading: aiSuggestionLoading,
        error: aiSuggestionError,
        fetchSuggestion: fetchAiSuggestion,
        clearSuggestion: clearAiSuggestion,
    } = useAISuggestion({ enabled: isAiAutocompleteEnabled })
    const filteredSearchFiles = useMemo(() => {
        const normalized = searchQuery.trim().toLowerCase()
        if (!normalized) return files.slice(0, 100)

        return files
            .filter((file) => file.path.toLowerCase().includes(normalized))
            .slice(0, 100)
    }, [files, searchQuery])
    const editorOptions = useMemo(
        () => ({
            ...(defaultEditorOptions as unknown as MonacoEditor.IStandaloneEditorConstructionOptions),
            quickSuggestions: isAiAutocompleteEnabled,
            suggestOnTriggerCharacters: isAiAutocompleteEnabled,
            inlineSuggest: {
                enabled: isAiAutocompleteEnabled,
            },
        }),
        [isAiAutocompleteEnabled],
    )
    const displayNameError = useMemo(() => {
        const trimmed = pendingDisplayName.trim()
        if (!trimmed) return 'Name is required.'
        if (trimmed.length < 2) return 'Use at least 2 characters.'
        return ''
    }, [pendingDisplayName])
    const filePathError = useMemo(() => {
        const normalizedPath = normalizePath(pendingFilePath)
        if (!normalizedPath) return 'File path is required.'
        if (normalizedPath.endsWith('/')) return 'File path cannot end with /.'
        if (/\/{2,}/.test(normalizedPath)) return 'File path cannot contain repeated / separators.'

        const fileName = normalizedPath.split('/').pop() ?? ''
        if (!fileName.includes('.')) return 'Include a file extension such as .ts or .js.'
        if (files.some((file) => file.path === normalizedPath)) return 'A file with this path already exists.'

        return ''
    }, [files, pendingFilePath])
    const folderPathError = useMemo(() => {
        const normalizedPath = normalizePath(pendingFolderPath).replace(/\/+$/, '')
        if (!normalizedPath) return 'Folder path is required.'
        if (/\/{2,}/.test(normalizedPath)) return 'Folder path cannot contain repeated / separators.'
        if (files.some((file) => file.path === normalizedPath || file.path.startsWith(`${normalizedPath}/`))) {
            return 'A folder with this path already exists.'
        }

        return ''
    }, [files, pendingFolderPath])

    useEffect(() => {
        filesRef.current = files
    }, [files])

    useEffect(() => {
        activePathRef.current = activePath
    }, [activePath])

    useEffect(() => {
        if (collab) return
        setDisplayName(ownerSessionName)
        setPendingDisplayName(ownerSessionName)
    }, [collab, ownerSessionName])

    useEffect(() => {
        if (!collab || displayName) return
        if (typeof window === 'undefined') return

        const storedName = window.localStorage.getItem('builditup-collab-display-name')
        const trimmed = storedName?.trim().slice(0, 40) || ''
        if (!trimmed) return

        setDisplayName(trimmed)
        setPendingDisplayName(trimmed)
    }, [collab, displayName])

    useEffect(() => {
        const token = collab?.token
        if (!token) return

        let cancelled = false
        async function loadSharedName() {
            try {
                const response = await fetch(`/api/share/${token}/content`, {
                    cache: 'no-store',
                })
                if (!response.ok) return

                const payload = (await response.json()) as { name?: string }
                if (cancelled) return
                if (typeof payload.name === 'string' && payload.name.trim()) {
                    setPlaygroundName(payload.name.trim())
                }
            } catch {
                // Keep fallback title on transient failures.
            }
        }

        void loadSharedName()
        return () => {
            cancelled = true
        }
    }, [collab?.token])

    useEffect(() => {
        if (isAiSettingsOpen) return

        let cancelled = false
        async function refreshAiProvider() {
            try {
                const settings = await getAiSettings()
                if (cancelled) return

                const providerKey = settings?.provider ?? null
                setActiveAiProvider(providerKey ? (PROVIDER_LABELS[providerKey] ?? providerKey) : null)
            } catch {
                if (!cancelled) {
                    setActiveAiProvider(null)
                }
            }
        }

        void refreshAiProvider()
        return () => {
            cancelled = true
        }
    }, [isAiSettingsOpen])

    useEffect(() => {
        function handleFullscreenChange() {
            setIsFullscreen(Boolean(document.fullscreenElement))
        }

        handleFullscreenChange()
        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }, [])

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            editorRef.current?.layout()
        })

        return () => window.cancelAnimationFrame(frame)
    }, [activePath, files, isSplitEditorOpen])

    useEffect(() => {
        if (!isSplitEditorOpen) return
        if (splitFilePath && files.some((file) => file.path === splitFilePath)) return

        const fallback = files.find((file) => file.path !== activePath)?.path ?? activePath
        setSplitFilePath(fallback)
    }, [activePath, files, isSplitEditorOpen, splitFilePath])

    const applyFileToEditor = useCallback((nextPath: string, nextFiles: SharedFile[]) => {
        const currentEditor = editorRef.current
        const model = currentEditor?.getModel()
        if (!currentEditor || !model) return

        const nextFile = nextFiles.find((file) => file.path === nextPath) ?? nextFiles[0]
        const nextText = nextFile?.content ?? ''
        if (model.getValue() === nextText) return

        isApplyingRemoteEditRef.current = true
        try {
            model.setValue(nextText)
        } finally {
            isApplyingRemoteEditRef.current = false
        }
    }, [])

    const toClassSafeId = useCallback((userId: string) => userId.replace(/[^a-zA-Z0-9_-]/g, '_'), [])

    const applyRemoteOperation = useCallback((op: TextOperations, _authorId?: string, _rev?: number) => {
        serializedDocRef.current = apply(serializedDocRef.current, op)
        const nextFiles = extractFilesFromUnknown(serializedDocRef.current)
        const nextActivePath =
            nextFiles.find((file) => file.path === activePathRef.current)?.path ?? nextFiles[0]?.path ?? 'main.ts'

        filesRef.current = nextFiles
        setFiles(nextFiles)
        setActivePath(nextActivePath)
        applyFileToEditor(nextActivePath, nextFiles)
    }, [applyFileToEditor])

    const handleServerInit = useCallback((content: string, fileTree?: unknown | null) => {
        serializedDocRef.current = content
        const normalizedTree = normalizeTemplateTree(fileTree ?? null)
        const nextFiles = extractFilesFromUnknown(normalizedTree ?? content)
        const nextActivePath =
            nextFiles.find((file) => file.path === activePathRef.current)?.path ?? nextFiles[0]?.path ?? 'main.ts'

        filesRef.current = nextFiles
        setFiles(nextFiles)
        setActivePath(nextActivePath)
        applyFileToEditor(nextActivePath, nextFiles)
    }, [applyFileToEditor])

    const ownerDisplayName = collab ? displayName : ownerSessionName

    const { users, isConnected, sendOp, localUserId, updateDisplayName } = useCollaboration({
        token: collab?.token ?? '',
        displayName: ownerDisplayName ?? undefined,
        editor,
        activeFilePath: activePath,
        wsUrl: process.env.NEXT_PUBLIC_COLLAB_WS_URL,
        enabled: Boolean(collab?.token && displayName),
        onServerOperation: (op, authorId, rev) => applyRemoteOperation(op, authorId, rev),
        onServerInit: (content, _rev, fileTree) => handleServerInit(content, fileTree),
    })
    

    const activePeopleCount = useMemo(() => {
        const unique = new Set<string>()
        if (localUserId) unique.add(localUserId)
        for (const user of users) {
            if (user.isActive) unique.add(user.userId)
        }
        return unique.size
    }, [localUserId, users])

    const syncFilesToCollab = useCallback((nextFiles: SharedFile[], nextPath?: string) => {
        const previousSerialized = serializedDocRef.current
        const nextSerialized = serializeFiles(nextFiles)
        const ops = buildOpsFromSerializedDiff(previousSerialized, nextSerialized)

        if (ops.length > 0) {
            for (const op of ops) {
                sendOp(op)
            }
            setIsDirty(true)
        }

        serializedDocRef.current = nextSerialized
        filesRef.current = nextFiles
        setFiles(nextFiles)

        if (nextPath) {
            setActivePath(nextPath)
            activePathRef.current = nextPath
            applyFileToEditor(nextPath, nextFiles)
        }
    }, [applyFileToEditor, sendOp])

    useEffect(() => {
        const handleOpenConflict = (event: Event) => {
            const customEvent = event as CustomEvent<CollaborationConflict>
            setActiveConflict(customEvent.detail)
        }
        window.addEventListener('collab-conflict-open', handleOpenConflict)
        return () => window.removeEventListener('collab-conflict-open', handleOpenConflict)
    }, [])

    const conflictSides = useMemo(() => {
        if (!activeConflict) return null
        const isMineA = localUserId ? activeConflict.authorAId === localUserId : true
        const mineName = isMineA ? 'You' : (users.find((u) => u.userId === activeConflict.authorAId)?.displayName ?? activeConflict.authorAId)
        const theirsName = isMineA ? (users.find((u) => u.userId === activeConflict.authorBId)?.displayName ?? activeConflict.authorBId) : 'You'
        const mineText = isMineA ? activeConflict.contentA : activeConflict.contentB
        const theirsText = isMineA ? activeConflict.contentB : activeConflict.contentA
        const dmp = new diff_match_patch()
        const diffs = dmp.diff_main(mineText, theirsText)
        dmp.diff_cleanupSemantic(diffs)
        const mergedText = mineText.includes(theirsText) ? mineText : theirsText.includes(mineText) ? theirsText : `${mineText}\n${theirsText}`
        return { mineName, theirsName, mineText, theirsText, diffs, mergedText }
    }, [activeConflict, localUserId, users])

    const renderDiffText = useCallback((side: 'mine' | 'theirs') => {
        if (!conflictSides) return null
        return conflictSides.diffs.map(([kind, text], index) => {
            if (kind === DIFF_EQUAL) return <span key={`${side}-${index}`}>{text}</span>
            if (side === 'mine' && kind === DIFF_DELETE)
                return <span key={`${side}-${index}`} className="rounded bg-red-500/15 text-red-200 line-through">{text}</span>
            if (side === 'theirs' && kind === DIFF_INSERT)
                return <span key={`${side}-${index}`} className="rounded bg-emerald-500/15 text-emerald-200">{text}</span>
            return null
        })
    }, [conflictSides])

    const applyEditorValue = useCallback((nextValue: string) => {
        const currentEditor = editorRef.current
        const model = currentEditor?.getModel()
        if (!currentEditor || !model) return
        isApplyingRemoteEditRef.current = true
        try {
            model.setValue(nextValue)
        } finally {
            isApplyingRemoteEditRef.current = false
        }
    }, [])

    const cursorCss = useMemo(() => {
        return users
            .map((user) => {
                const classId = toClassSafeId(user.userId)
                return `
.remote-cursor-${classId} {
    border-left: 4px solid ${user.color};
    background: ${user.color}2e;
    box-shadow: inset 0 0 0 1px ${user.color}33;
}
.remote-cursor-label-${classId} {
    color: ${user.color};
    font-size: 10px;
    font-weight: 600;
    margin-left: 4px;
    letter-spacing: 0.02em;
}
.remote-cursor-avatar-${classId} {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    margin-left: 6px;
    border-radius: 9999px;
    border: 1px solid ${user.color};
    background: ${user.color}22;
    color: ${user.color};
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.01em;
}
`
            })
            .join('\n')
    }, [toClassSafeId, users])

    const handleKeepMine = useCallback(() => setActiveConflict(null), [])
    const handleKeepTheirs = useCallback(() => {
        if (!conflictSides) return
        applyEditorValue(conflictSides.theirsText)
        setActiveConflict(null)
    }, [applyEditorValue, conflictSides])
    const handleMerge = useCallback(() => {
        if (!conflictSides) return
        applyEditorValue(conflictSides.mergedText)
        setActiveConflict(null)
    }, [applyEditorValue, conflictSides])

    useEffect(() => {
        const currentEditor = editorRef.current
        const monaco = monacoRef.current
        const decorations = decorationsRef.current
        if (!currentEditor || !monaco || !decorations) return

        // Rebuild cursor widgets on each presence update so avatar tooltips are reliable.
        for (const widget of widgetsRef.current.values()) {
            try {
                currentEditor.removeContentWidget(widget)
            } catch {
                // Widget may already be detached.
            }
        }
        widgetsRef.current.clear()

        const visibleCursorUsers = users.filter(
            (user) => user.cursor && user.cursor.filePath === activePath,
        )

        decorations.set(
            visibleCursorUsers.flatMap((user) => {
                if (!user.cursor) return []
                const classId = toClassSafeId(user.userId)
                return [{
                    range: new monaco.Range(
                        user.cursor.startLine, user.cursor.startCol,
                        user.cursor.endLine, user.cursor.endColumn,
                    ),
                    options: {
                        className: `remote-cursor-${classId}`,
                    },
                }]
            }),
        )

        for (const user of visibleCursorUsers) {
            if (!user.cursor) continue

            const lineHeight = currentEditor.getOption(monaco.editor.EditorOption.lineHeight)
            const classId = toClassSafeId(user.userId)
            const widgetId = `remote-cursor-widget-${classId}`
            const domNode = document.createElement('div')
            domNode.className = 'collab-cursor-widget'
            domNode.style.cssText = `
                position:relative;
                display:block;
                width:2px;
                height:${lineHeight}px;
                margin:0;
                padding:0;
                background:${user.color};
                border:none;
                pointer-events:auto;
                cursor:help;
                z-index:100;
                transform:none;
            `
            domNode.title = user.displayName || user.userId

            // Always show collaborator info beside the cursor.
            const tooltipNode = document.createElement('div')
            tooltipNode.textContent = user.displayName || user.userId
            tooltipNode.style.cssText = `
                position:absolute;
                left:4px;
                top:-24px;
                display:block;
                white-space:nowrap;
                padding:2px 6px;
                border-radius:6px;
                border:1px solid #1e2028;
                background:#11161d;
                color:#d7e2f1;
                font-size:10px;
                line-height:1.2;
                pointer-events:none;
            `
            domNode.appendChild(tooltipNode)

            domNode.animate(
                [{ opacity: 1 }, { opacity: 0.25 }, { opacity: 1 }],
                { duration: 950, iterations: Number.POSITIVE_INFINITY },
            )

            const widget: MonacoEditor.IContentWidget = {
                getId: () => widgetId,
                getDomNode: () => domNode,
                getPosition: () => ({
                    position: {
                        lineNumber: user.cursor!.startLine,
                        column: user.cursor!.startCol,
                    },
                    preference: [
                        monaco.editor.ContentWidgetPositionPreference.EXACT,
                    ],
                }),
            }

            currentEditor.addContentWidget(widget)
            currentEditor.layoutContentWidget(widget)
            widgetsRef.current.set(widgetId, widget)
        }

        return () => {
            for (const widget of widgetsRef.current.values()) {
                try {
                    currentEditor.removeContentWidget(widget)
                } catch {
                    // Widget may already be detached.
                }
            }
            widgetsRef.current.clear()
        }
    }, [activePath, toClassSafeId, users])

    const handleEditorMount: OnMount = useCallback((mountedEditor, monaco) => {
        monacoRef.current = monaco
        editorRef.current = mountedEditor
        setEditor(mountedEditor)
        decorationsRef.current = mountedEditor.createDecorationsCollection([])
        configureMonaco(monaco)

        const model = mountedEditor.getModel()
        if (!model) return

        mountedEditor.onDidChangeModelContent((event) => {
            if (isApplyingRemoteEditRef.current) return

            const currentPath = activePathRef.current
            if (!currentPath) return

            const previousFiles = filesRef.current
            const nextEditorText = model.getValue()
            const nextFiles = previousFiles.map((file) =>
                file.path === currentPath ? { ...file, content: nextEditorText } : file,
            )

            syncFilesToCollab(nextFiles)
        })
    }, [syncFilesToCollab])

    useEffect(() => {
        const currentEditor = editorRef.current
        const monaco = monacoRef.current
        if (!currentEditor || !monaco) return

        inlineProviderRef.current?.dispose()
        const currentLanguage = getEditorLanguage(activePath.split('.').pop() ?? '')

        const provider = monaco.languages.registerInlineCompletionsProvider(currentLanguage, {
            provideInlineCompletions: async (
                model: MonacoEditor.ITextModel,
                position: Position,
                _context: MonacoLanguages.InlineCompletionContext,
                token: CancellationToken,
            ) => {
                if (!isAiAutocompleteEnabled) {
                    return { items: [] }
                }

                if (currentEditor.getModel() !== model) {
                    return { items: [] }
                }

                const selection = currentEditor.getSelection()
                const hasSelection = Boolean(selection && !selection.isEmpty())
                const selectedText = hasSelection ? model.getValueInRange(selection!) : ''

                const suggestion = await fetchAiSuggestion({
                    fileName: activePath,
                    fileContent: model.getValue(),
                    cursorLine: Math.max(0, position.lineNumber - 1),
                    cursorColumn: Math.max(0, position.column - 1),
                    selectionStartLine: hasSelection ? selection!.startLineNumber - 1 : undefined,
                    selectionStartColumn: hasSelection ? selection!.startColumn - 1 : undefined,
                    selectionEndLine: hasSelection ? selection!.endLineNumber - 1 : undefined,
                    selectionEndColumn: hasSelection ? selection!.endColumn - 1 : undefined,
                    selectedText: hasSelection ? selectedText : undefined,
                })

                if (token.isCancellationRequested || !suggestion.trim()) {
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
                            insertText: suggestion,
                            range: replaceRange,
                        },
                    ],
                }
            },
            freeInlineCompletions: () => {
                // Monaco handles completion lifecycle internally.
            },
        })

        inlineProviderRef.current = provider
        return () => {
            provider.dispose()
            if (inlineProviderRef.current === provider) {
                inlineProviderRef.current = null
            }
        }
    }, [activePath, fetchAiSuggestion, isAiAutocompleteEnabled])

    const handleSelectFile = useCallback((path: string) => {
        setActivePath(path)
        activePathRef.current = path
        applyFileToEditor(path, filesRef.current)
    }, [applyFileToEditor])

    const handleSaveToDatabase = useCallback(async (silent = false) => {
        if (!collab?.token) {
            if (!silent) {
                toast.error('Save is available only in a collaborative shared session')
            }
            return
        }

        setIsSaving(true)
        try {
            const response = await fetch(`/api/share/${collab.token}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            })

            const payload = (await response.json().catch(() => null)) as
                | {
                    ok?: boolean
                    error?: string
                }
                | null

            if (!response.ok || !payload?.ok) {
                throw new Error(payload?.error ?? 'Failed to save collaborative session')
            }

            const timestamp = new Date().toLocaleTimeString()
            setLastSavedAt(timestamp)
            setIsDirty(false)
            router.refresh()
            if (!silent) {
                toast.success('Collaborative session saved to database')
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save collaborative session'
            if (!silent) {
                toast.error(message)
            }
        } finally {
            setIsSaving(false)
        }
    }, [collab?.token, router])

    const handleSoftReload = useCallback(async () => {
        if (!collab?.token) return

        setIsSoftReloading(true)
        try {
            const response = await fetch(`/api/share/${collab.token}/content`, {
                cache: 'no-store',
            })

            const payload = (await response.json().catch(() => null)) as
                | {
                    content?: unknown
                    name?: string
                    error?: string
                }
                | null

            if (!response.ok) {
                throw new Error(payload?.error ?? 'Failed to reload saved content')
            }

            const nextFiles = extractFilesFromUnknown(payload?.content)
            const nextActivePath =
                nextFiles.find((file) => file.path === activePathRef.current)?.path ??
                nextFiles[0]?.path ??
                'main.ts'

            const serialized = serializeFiles(nextFiles)
            serializedDocRef.current = serialized
            filesRef.current = nextFiles
            activePathRef.current = nextActivePath
            setFiles(nextFiles)
            setActivePath(nextActivePath)
            applyFileToEditor(nextActivePath, nextFiles)
            setIsDirty(false)

            if (typeof payload?.name === 'string' && payload.name.trim()) {
                setPlaygroundName(payload.name.trim())
            }

            toast.success('Reloaded latest saved content')
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to reload saved content'
            toast.error(message)
        } finally {
            setIsSoftReloading(false)
        }
    }, [applyFileToEditor, collab?.token])

    useEffect(() => {
        if (!isDirty || !collab?.token) return

        if (autosaveTimerRef.current) {
            clearTimeout(autosaveTimerRef.current)
        }

        autosaveTimerRef.current = setTimeout(() => {
            void handleSaveToDatabase(true)
        }, 8000)

        return () => {
            if (autosaveTimerRef.current) {
                clearTimeout(autosaveTimerRef.current)
            }
        }
    }, [collab?.token, handleSaveToDatabase, isDirty])

    const handleSetDisplayName = useCallback(() => {
        setPendingDisplayName(displayName ?? '')
        setIsDisplayNameDialogOpen(true)
    }, [displayName])

    const handleConfirmDisplayName = useCallback(() => {
        if (displayNameError) return
        const trimmed = pendingDisplayName.trim().slice(0, 40)
        if (!trimmed) return

        setDisplayName(trimmed)
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('builditup-collab-display-name', trimmed)
        }
        updateDisplayName(trimmed)
        setIsDisplayNameDialogOpen(false)
    }, [displayNameError, pendingDisplayName, updateDisplayName])

    const handleAddFile = useCallback(() => {
        setPendingFilePath('src/main.ts')
        setIsAddFileDialogOpen(true)
    }, [])

    const handleConfirmAddFile = useCallback(() => {
        if (filePathError) return
        const nextPath = normalizePath(pendingFilePath)
        if (!nextPath) return

        const exists = filesRef.current.some((file) => file.path === nextPath)
        if (exists) {
            toast.error('File already exists')
            return
        }

        const ext = nextPath.split('.').pop() ?? ''
        const nextFiles = [
            ...filesRef.current,
            {
                path: nextPath,
                content: '',
                language: getEditorLanguage(ext),
            },
        ]
        syncFilesToCollab(nextFiles, nextPath)
        setIsAddFileDialogOpen(false)
    }, [filePathError, pendingFilePath, syncFilesToCollab])

    const handleAddFolder = useCallback(() => {
        setPendingFolderPath('src/utils')
        setIsAddFolderDialogOpen(true)
    }, [])

    const handleConfirmAddFolder = useCallback(() => {
        if (folderPathError) return
        const folderPath = normalizePath(pendingFolderPath).replace(/\/+$/, '')
        if (!folderPath) return

        const placeholderPath = `${folderPath}/index.ts`
        const exists = filesRef.current.some((file) => file.path === folderPath || file.path.startsWith(`${folderPath}/`))
        if (exists) {
            toast.error('Folder already exists')
            return
        }

        const nextFiles = [
            ...filesRef.current,
            {
                path: placeholderPath,
                content: '// New folder file',
                language: 'typescript',
            },
        ]
        syncFilesToCollab(nextFiles, placeholderPath)
        setIsAddFolderDialogOpen(false)
    }, [folderPathError, pendingFolderPath, syncFilesToCollab])

    const handleSplitEditorChange = useCallback((value: string | undefined) => {
        if (!splitFilePath) return
        const nextText = value ?? ''
        const nextFiles = filesRef.current.map((file) =>
            file.path === splitFilePath ? { ...file, content: nextText } : file,
        )
        syncFilesToCollab(nextFiles)
    }, [splitFilePath, syncFilesToCollab])

    const handleInsertAiText = useCallback((text: string) => {
        if (!text.trim()) return
        const currentPath = activePathRef.current
        if (!currentPath) return

        const currentEditor = editorRef.current
        if (currentEditor) {
            const position = currentEditor.getPosition()
            if (position) {
                currentEditor.executeEdits('ai-chat-insert', [
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
                return
            }
        }

        const nextFiles = filesRef.current.map((file) =>
            file.path === currentPath ? { ...file, content: `${file.content}${text}` } : file,
        )
        syncFilesToCollab(nextFiles)
    }, [syncFilesToCollab])

    const handleToggleFullscreen = useCallback(async () => {
        if (typeof document === 'undefined') return
        if (document.fullscreenElement) {
            await document.exitFullscreen()
            return
        }
        await document.documentElement.requestFullscreen()
    }, [])

    const handleToggleAiAutocomplete = useCallback((enabled: boolean) => {
        setIsAiAutocompleteEnabled(enabled)
        if (!enabled) {
            clearAiSuggestion()
            editorRef.current?.trigger('ai-inline-hide', 'editor.action.inlineSuggest.hide', {})
        }
    }, [clearAiSuggestion])

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (!(event.ctrlKey || event.metaKey)) return
            if (event.key.toLowerCase() === 'p') {
                event.preventDefault()
                setIsSearchDialogOpen(true)
                return
            }

            if (event.key.toLowerCase() === 'i') {
                if (!isAiAutocompleteEnabled) return
                event.preventDefault()
                const currentEditor = editorRef.current
                if (!currentEditor) return
                currentEditor.focus()
                currentEditor.trigger('ai-inline-trigger', 'editor.action.inlineSuggest.trigger', {})
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isAiAutocompleteEnabled])

    const renderFileTree = useCallback((nodes: Array<{ name: string; path: string; type: 'folder' | 'file'; children?: Array<any> }>, depth = 0): React.ReactNode => {
        return nodes.map((node) => {
            if (node.type === 'folder') {
                return (
                    <div key={node.path}>
                        <div
                            className="flex items-center gap-2 px-3 py-1 text-xs text-[#8ea5b5]"
                            style={{ paddingLeft: `${12 + depth * 10}px` }}
                        >
                            <Folder size={12} className="text-[#5cc8ff]" />
                            <span className="truncate">{node.name}</span>
                        </div>
                        {node.children ? renderFileTree(node.children, depth + 1) : null}
                    </div>
                )
            }

            const isActive = activeFile?.path === node.path
            return (
                <button
                    key={node.path}
                    type="button"
                    onClick={() => handleSelectFile(node.path)}
                    className={`flex w-full items-center gap-2 px-3 py-1 text-left text-xs transition-colors ${isActive
                        ? 'bg-[#00d4aa]/12 text-[#d7e2f1]'
                        : 'text-[#8ea5b5] hover:bg-[#11161d] hover:text-white'
                        }`}
                    style={{ paddingLeft: `${12 + depth * 10}px` }}
                >
                    <File size={12} className="text-[#7ae8cc]" />
                    <span className="truncate">{node.name}</span>
                </button>
            )
        })
    }, [activeFile?.path, handleSelectFile])

    if (collab && !displayName) {
        return (
            <JoinNameGate
                onJoin={(name) => {
                    const trimmed = name.trim().slice(0, 40)
                    if (!trimmed) return
                    setDisplayName(trimmed)
                    setPendingDisplayName(trimmed)
                    if (typeof window !== 'undefined') {
                        window.localStorage.setItem('builditup-collab-display-name', trimmed)
                    }
                }}
            />
        )
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#0a0d12]">
            <SidebarInset className="relative flex flex-1 flex-col overflow-hidden text-white">
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-[#1e2028] bg-[#080e13] px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center gap-2 rounded-xl border border-[#1e2028] bg-[#11161d] px-3 py-1.5">
                            <FileCode2 size={16} className="text-[#00d4aa]" />
                            <span className="font-mono text-[13px] font-medium text-[#c9d4e5]">
                                {playgroundName}
                            </span>
                        </div>

                        {/* Collab connection badge */}
                        {collab && (
                            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs border ${isConnected
                                ? 'bg-[#00d4aa]/10 border-[#00d4aa]/20 text-[#00d4aa]'
                                : 'bg-[#1e2028]/50 border-[#1e2028] text-[#8ea5b5]'
                                }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-[#00d4aa] animate-pulse' : 'bg-[#8ea5b5]'
                                    }`} />
                                <span>{isConnected ? 'Live' : 'Connecting…'}</span>
                            </div>
                        )}

                        {/* Canva-style presence avatars */}
                        <PresenceAvatars users={users} localUserId={localUserId} maxVisible={4} />

                        {collab && (
                            <div className="hidden min-w-0 items-center gap-2 rounded-md border border-[#1e2028] bg-[#11161d] px-2.5 py-1 text-xs text-[#8ea5b5] lg:flex">
                                <span className="text-[#d7e2f1]">{activePeopleCount} active</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsSearchDialogOpen(true)}
                            className="flex items-center gap-1.5 rounded-md border border-[#1e2028] bg-[#11161d] px-3 py-1.5 text-xs text-[#8ea5b5] transition-colors hover:border-[#00d4aa]/30 hover:text-white"
                            title="Search files"
                        >
                            <Search size={13} />
                            <span>Search</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                void handleToggleFullscreen()
                            }}
                            className="flex items-center gap-1.5 rounded-md border border-[#1e2028] bg-[#11161d] px-3 py-1.5 text-xs text-[#8ea5b5] transition-colors hover:border-[#00d4aa]/30 hover:text-white"
                            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                        >
                            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                            <span>{isFullscreen ? 'Windowed' : 'Fullscreen'}</span>
                        </button>

                        {collab && (
                            <button
                                type="button"
                                onClick={handleSetDisplayName}
                                className="rounded-md border border-[#1e2028] bg-[#11161d] px-3 py-1.5 text-xs text-[#8ea5b5] transition-colors hover:border-[#00d4aa]/30 hover:text-white"
                                title="Change display name"
                            >
                                Name: {displayName ?? ownerSessionName}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setIsSplitEditorOpen((current) => !current)}
                            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${isSplitEditorOpen
                                ? 'border-[#00d4aa]/40 bg-[#00d4aa]/10 text-[#7ae8cc]'
                                : 'border-[#1e2028] bg-[#11161d] text-[#8ea5b5] hover:text-white'
                                }`}
                            title="Toggle split editor"
                        >
                            <SplitSquareVertical size={13} />
                            <span>Split</span>
                        </button>

                        <ToggleAi
                            isAiAutocompleteEnabled={isAiAutocompleteEnabled}
                            isAiChatOpen={isAiChatOpen}
                            onToggleAutocomplete={handleToggleAiAutocomplete}
                            onOpenChat={() => setIsAiChatOpen(true)}
                            onCloseChat={() => setIsAiChatOpen(false)}
                            onOpenSettings={() => setIsAiSettingsOpen(true)}
                            activeProvider={activeAiProvider}
                        />
                        <Link
                            href="/"
                            className="flex h-7 w-8 items-center justify-center rounded-md border border-[#1e2028] bg-[#11161d] text-[#8ea5b5] transition-colors hover:border-[#00d4aa]/30 hover:text-white"
                            title="Home"
                        >
                            <House size={14} />
                        </Link>

                        {collab && (
                            <button
                                type="button"
                                onClick={() => void handleSaveToDatabase()}
                                disabled={isSaving}
                                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${isSaving
                                    ? 'cursor-not-allowed border-[#1e2028] bg-[#11161d] text-[#6a7280]'
                                    : 'border-[#00d4aa]/40 bg-[#00d4aa]/10 text-[#7ae8cc] hover:border-[#00d4aa]/70 hover:bg-[#00d4aa]/15'
                                    }`}
                                title="Save collaborative session to database"
                            >
                                <Save size={13} />
                                <span>{isSaving ? 'Saving…' : 'Save'}</span>
                            </button>
                        )}

                        {collab && (
                            <button
                                type="button"
                                onClick={() => void handleSoftReload()}
                                disabled={isSoftReloading}
                                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${isSoftReloading
                                    ? 'cursor-not-allowed border-[#1e2028] bg-[#11161d] text-[#6a7280]'
                                    : 'border-[#1e2028] bg-[#11161d] text-[#8ea5b5] hover:border-[#00d4aa]/30 hover:text-white'
                                    }`}
                                title="Reload latest saved content"
                            >
                                <RotateCw size={13} className={isSoftReloading ? 'animate-spin' : ''} />
                                <span>{isSoftReloading ? 'Reloading…' : 'Soft Reload'}</span>
                            </button>
                        )}

                        {lastSavedAt && (
                            <span className="hidden text-[11px] text-[#6f8193] md:inline">Saved {lastSavedAt}</span>
                        )}

                        {isDirty && (
                            <span className="hidden text-[11px] text-[#c7b87d] md:inline">Unsaved changes</span>
                        )}

                        <Link
                            href="/dashboard"
                            className="rounded-md border border-[#1e2028] bg-[#11161d] px-3 py-1.5 text-xs text-[#8ea5b5] transition-colors hover:border-[#00d4aa]/30 hover:text-white"
                        >
                            Go to Dashboard
                        </Link>
                    </div>
                </div>

                <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
                    <DialogContent className="max-w-3xl gap-0 overflow-hidden border-[#1e2028] bg-[#11161d] p-0 text-white">
                        <DialogHeader className="border-b border-[#1e2028] px-4 py-3">
                            <DialogTitle>Search files</DialogTitle>
                        </DialogHeader>

                        <div className="border-b border-[#1e2028] px-4 py-3">
                            <Input
                                autoFocus
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Type a file name or path..."
                                className="border-[#1e2028] bg-[#0f141b] text-white placeholder:text-[#6a7280]"
                            />
                        </div>

                        <ScrollArea className="max-h-[60vh]">
                            <div className="space-y-2 p-3">
                                {filteredSearchFiles.length > 0 ? (
                                    filteredSearchFiles.map((file) => (
                                        <button
                                            key={file.path}
                                            type="button"
                                            onClick={() => {
                                                handleSelectFile(file.path)
                                                setIsSearchDialogOpen(false)
                                            }}
                                            className="w-full rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-[#1e2028] hover:bg-[#0f141b]"
                                        >
                                            <div className="truncate text-sm font-medium text-[#d6e1ef]">
                                                {file.path}
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="py-10 text-center text-sm text-[#8ea5b5]">
                                        No matching files found.
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>

                <AiSettingsModal
                    isOpen={isAiSettingsOpen}
                    onClose={() => setIsAiSettingsOpen(false)}
                />

                {/* Monaco editor */}
                <div className="flex flex-1 overflow-hidden">
                    <aside className="hidden w-64 shrink-0 border-r border-[#1e2028] bg-[#0c1117] md:flex md:flex-col">
                        <div className="border-b border-[#1e2028] px-3 py-2">
                            <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-[#6f8193]">Files</div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleAddFile}
                                    className="rounded border border-[#1e2028] bg-[#11161d] px-2 py-1 text-[10px] text-[#8ea5b5] hover:text-white"
                                >
                                    + File
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddFolder}
                                    className="rounded border border-[#1e2028] bg-[#11161d] px-2 py-1 text-[10px] text-[#8ea5b5] hover:text-white"
                                >
                                    + Folder
                                </button>
                            </div>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto py-2">{renderFileTree(fileTree)}</div>
                    </aside>

                    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                        <div className="flex h-8 items-center border-b border-[#1e2028] bg-[#10161d] px-3 text-xs text-[#8ea5b5]">
                            <span className="text-[#6f8193]">Editing</span>
                            <span className="mx-2 text-[#33404e]">/</span>
                            <span className="truncate text-[#d7e2f1]">{activeFile?.path ?? 'No file selected'}</span>
                            {aiSuggestionLoading ? (
                                <span className="ml-3 text-[10px] text-[#6f8193]">AI thinking...</span>
                            ) : null}
                            {aiSuggestionError ? (
                                <span className="ml-3 max-w-72 truncate text-[10px] text-[#ef8d8d]">
                                    {aiSuggestionError}
                                </span>
                            ) : null}
                        </div>

                        <div className={`min-h-0 flex-1 overflow-hidden ${isSplitEditorOpen ? 'grid grid-cols-2' : ''}`}>
                            <div className={`${isSplitEditorOpen ? 'border-r border-[#1e2028]' : ''} min-h-0 overflow-hidden`}>
                                <Editor
                                    height="100%"
                                    language={activeFile?.language ?? 'typescript'}
                                    value={activeFile?.content ?? ''}
                                    theme="modern-dark"
                                    onMount={handleEditorMount}
                                    options={editorOptions}
                                    path={`${playgroundId}-${activeFile?.path ?? 'main.ts'}`}
                                    keepCurrentModel={true}
                                    loading={
                                        <div className="flex h-full items-center justify-center text-xs text-[#6f8193]">
                                            Loading...
                                        </div>
                                    }
                                />
                            </div>

                            {isSplitEditorOpen && (
                                <div className="flex min-h-0 flex-col overflow-hidden">
                                    <div className="flex h-8 items-center border-b border-[#1e2028] bg-[#10161d] px-3 text-xs text-[#8ea5b5]">
                                        <span className="mr-2 text-[#6f8193]">Split file</span>
                                        <select
                                            value={splitFilePath || activeFile?.path || ''}
                                            onChange={(event) => setSplitFilePath(event.target.value)}
                                            className="h-6 max-w-64 rounded border border-[#1e2028] bg-[#11161d] px-2 text-xs text-[#c9d4e5]"
                                        >
                                            {files.map((file) => (
                                                <option key={file.path} value={file.path}>{file.path}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <Editor
                                        height="calc(100% - 2rem)"
                                        language={splitFile?.language ?? activeFile?.language ?? 'typescript'}
                                        value={splitFile?.content ?? activeFile?.content ?? ''}
                                        theme="modern-dark"
                                        options={editorOptions}
                                        onChange={handleSplitEditorChange}
                                        path={`${playgroundId}-split-${splitFile?.path ?? activeFile?.path ?? 'main.ts'}`}
                                        keepCurrentModel={true}
                                        loading={
                                            <div className="flex h-full items-center justify-center text-xs text-[#6f8193]">
                                                Loading...
                                            </div>
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SidebarInset>

            <PlaygroundAiSidebar
                isOpen={isAiChatOpen}
                onClose={() => setIsAiChatOpen(false)}
                fileName={activeFile?.path ?? 'main.ts'}
                fileContent={activeFile?.content ?? ''}
                onInsertInEditor={handleInsertAiText}
            />

            <Dialog open={isDisplayNameDialogOpen} onOpenChange={setIsDisplayNameDialogOpen}>
                <DialogContent className="border-[#1e2028] bg-[#0b1016] text-white">
                    <DialogHeader>
                        <DialogTitle>Update display name</DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault()
                            handleConfirmDisplayName()
                        }}
                        className="space-y-4"
                    >
                        <div className="space-y-2">
                            <Label htmlFor="collab-display-name">Name</Label>
                            <Input
                                id="collab-display-name"
                                value={pendingDisplayName}
                                onChange={(event) => setPendingDisplayName(event.target.value)}
                                maxLength={40}
                                autoFocus
                                placeholder="Your name"
                                className="border-[#1e2028] bg-[#11161d] text-white"
                            />
                            <p className={`text-xs ${displayNameError ? 'text-red-300' : 'text-[#6f8193]'}`}>
                                {displayNameError || 'Used in presence avatars and cursor labels.'}
                            </p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsDisplayNameDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={Boolean(displayNameError)}>
                                Save
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddFileDialogOpen} onOpenChange={setIsAddFileDialogOpen}>
                <DialogContent className="border-[#1e2028] bg-[#0b1016] text-white">
                    <DialogHeader>
                        <DialogTitle>Create file</DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault()
                            handleConfirmAddFile()
                        }}
                        className="space-y-4"
                    >
                        <div className="space-y-2">
                            <Label htmlFor="collab-new-file-path">File path</Label>
                            <Input
                                id="collab-new-file-path"
                                value={pendingFilePath}
                                onChange={(event) => setPendingFilePath(event.target.value)}
                                autoFocus
                                placeholder="src/main.ts"
                                className="border-[#1e2028] bg-[#11161d] text-white"
                            />
                            <p className={`text-xs ${filePathError ? 'text-red-300' : 'text-[#6f8193]'}`}>
                                {filePathError || 'Example: src/components/button.tsx'}
                            </p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsAddFileDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={Boolean(filePathError)}>
                                Create
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddFolderDialogOpen} onOpenChange={setIsAddFolderDialogOpen}>
                <DialogContent className="border-[#1e2028] bg-[#0b1016] text-white">
                    <DialogHeader>
                        <DialogTitle>Create folder</DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault()
                            handleConfirmAddFolder()
                        }}
                        className="space-y-4"
                    >
                        <div className="space-y-2">
                            <Label htmlFor="collab-new-folder-path">Folder path</Label>
                            <Input
                                id="collab-new-folder-path"
                                value={pendingFolderPath}
                                onChange={(event) => setPendingFolderPath(event.target.value)}
                                autoFocus
                                placeholder="src/utils"
                                className="border-[#1e2028] bg-[#11161d] text-white"
                            />
                            <p className={`text-xs ${folderPathError ? 'text-red-300' : 'text-[#6f8193]'}`}>
                                {folderPathError || 'A starter index.ts will be created in this folder.'}
                            </p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsAddFolderDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={Boolean(folderPathError)}>
                                Create
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Conflict resolution dialog */}
            <Dialog open={Boolean(activeConflict)} onOpenChange={(open) => !open && setActiveConflict(null)}>
                <DialogContent className="w-[min(92vw,1200px)] max-w-none overflow-hidden border-[#1e2028] bg-[#0b1016] p-0 text-white">
                    <DialogHeader className="border-b border-[#1e2028] px-6 py-4">
                        <DialogTitle className="text-base font-semibold text-white">
                            {conflictSides ? `You and ${conflictSides.theirsName} edited the same region` : 'Conflict detected'}
                        </DialogTitle>
                    </DialogHeader>

                    {conflictSides && (
                        <div className="mt-4 grid max-h-[68vh] gap-4 overflow-y-auto overflow-x-hidden px-6 lg:grid-cols-2">
                            <div className="min-w-0 rounded-xl border border-[#1e2028] bg-[#0f141a] p-4">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#8ea5b5]">{conflictSides.mineName}</div>
                                <ScrollArea className="h-[52vh] rounded-lg border border-[#1e2028] bg-[#080e13] p-4 font-mono text-sm leading-6 text-[#d7e2f1]">
                                    <div className="whitespace-pre-wrap wrap-break-word">{renderDiffText('mine')}</div>
                                </ScrollArea>
                            </div>
                            <div className="min-w-0 rounded-xl border border-[#1e2028] bg-[#0f141a] p-4">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#8ea5b5]">{conflictSides.theirsName}</div>
                                <ScrollArea className="h-[52vh] rounded-lg border border-[#1e2028] bg-[#080e13] p-4 font-mono text-sm leading-6 text-[#d7e2f1]">
                                    <div className="whitespace-pre-wrap wrap-break-word">{renderDiffText('theirs')}</div>
                                </ScrollArea>
                            </div>
                        </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-[#1e2028] px-6 py-4">
                        <button type="button" onClick={handleKeepMine}
                            className="rounded-md border border-[#1e2028] bg-[#11161d] px-4 py-2 text-sm text-white transition-colors hover:border-[#00d4aa]/30">
                            Keep mine
                        </button>
                        <button type="button" onClick={handleKeepTheirs}
                            className="rounded-md border border-[#00d4aa]/30 bg-[#00d4aa]/10 px-4 py-2 text-sm text-[#00d4aa] transition-colors hover:bg-[#00d4aa]/15">
                            Keep theirs
                        </button>
                        <button type="button" onClick={handleMerge}
                            className="rounded-md border border-[#5cc8ff]/30 bg-[#5cc8ff]/10 px-4 py-2 text-sm text-[#5cc8ff] transition-colors hover:bg-[#5cc8ff]/15">
                            Merge
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
