'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react'
import type { editor as MonacoEditor } from 'monaco-editor'
import { SidebarInset } from '@/components/ui/sidebar'
import { FileCode2, Lock, Loader2, AlertTriangle, Folder, File } from 'lucide-react'
import Link from 'next/link'
import { configureMonaco, defaultEditorOptions, getEditorLanguage } from '@/modules/playground/lib/editor-config'

interface PlaygroundViewerProps {
    playgroundId: string
    token: string
    readOnly?: boolean
}

interface ContentResponse {
    playgroundId: string
    name?: string
    content: unknown
    revision: number
    source: 'redis' | 'db'
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

function maybeParseJsonString(value: string): unknown {
    const text = value.trim()
    if (!text) return value
    const likelyJson = text.startsWith('{') || text.startsWith('[')
    if (!likelyJson) return value

    try {
        return JSON.parse(text)
    } catch {
        return value
    }
}

function toStringContent(value: unknown): string {
    if (typeof value === 'string') return value
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
}

function normalizePath(pathLike: string): string {
    return pathLike.replace(/^\/+/, '').replace(/\\/g, '/').trim()
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

function fromObjectEntries(obj: Record<string, unknown>): SharedFile[] {
    const files: SharedFile[] = []

    for (const [key, value] of Object.entries(obj)) {
        if (!key.includes('.')) continue
        const path = normalizePath(key)
        const ext = path.split('.').pop() ?? ''
        files.push({
            path,
            content: toStringContent(value),
            language: getEditorLanguage(ext),
        })
    }

    return files
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

function extractFiles(content: unknown): SharedFile[] {
    if (typeof content === 'string') {
        const parsed = maybeParseJsonString(content)
        if (parsed !== content) {
            return extractFiles(parsed)
        }
        return [{ path: 'main.ts', content, language: 'typescript' }]
    }

    if (Array.isArray(content)) {
        const files = content
            .map((item, index) => parseItemAsFile(item, index))
            .filter((file): file is SharedFile => file !== null)

        if (files.length > 0) return files
        return [{ path: 'main.json', content: JSON.stringify(content, null, 2), language: 'json' }]
    }

    if (content && typeof content === 'object') {
        const obj = content as Record<string, unknown>

        if (Array.isArray(obj.items)) {
            const runtimeFiles: SharedFile[] = []
            for (const child of obj.items) {
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

        if (Array.isArray(obj.files)) {
            const files = (obj.files as unknown[])
                .map((item: unknown, index: number) => parseItemAsFile(item, index))
                .filter((file: SharedFile | null): file is SharedFile => file !== null)

            if (files.length > 0) return files
        }

        if (Array.isArray(obj.children)) {
            const files = (obj.children as unknown[])
                .filter(isTemplateTreeNode)
                .flatMap((node) => {
                    const extracted: SharedFile[] = []
                    walkTemplateTree(node, extracted)
                    return extracted
                })

            if (files.length > 0) return files
        }

        if (obj.files && typeof obj.files === 'object' && !Array.isArray(obj.files)) {
            const mapFiles = fromObjectEntries(obj.files as Record<string, unknown>)
            if (mapFiles.length > 0) return mapFiles
        }

        const entryFiles = fromObjectEntries(obj)
        if (entryFiles.length > 0) return entryFiles

        if (typeof obj.content === 'string') {
            return [{ path: 'main.txt', content: obj.content, language: 'plaintext' }]
        }
        if (typeof obj.code === 'string') {
            return [{ path: 'main.ts', content: obj.code, language: 'typescript' }]
        }
        if (typeof obj.text === 'string') {
            return [{ path: 'main.txt', content: obj.text, language: 'plaintext' }]
        }

        return [{ path: 'main.json', content: JSON.stringify(content, null, 2), language: 'json' }]
    }

    return [{ path: 'main.txt', content: '', language: 'plaintext' }]
}

function buildFileTree(files: SharedFile[]): FileTreeNode[] {
    const root: FileTreeNode = {
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

            if (!cursor.children) cursor.children = []

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

            if (!isFile) {
                cursor = child
            }
        }
    }

    const sortTree = (nodes: FileTreeNode[]) => {
        nodes.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name)
            return a.type === 'folder' ? -1 : 1
        })
        for (const node of nodes) {
            if (node.children) sortTree(node.children)
        }
    }

    sortTree(root.children ?? [])
    return root.children ?? []
}

function detectLanguage(content: unknown): string {
    if (content && typeof content === 'object') {
        const obj = content as Record<string, unknown>

        if (typeof obj.language === 'string') return obj.language
        if (typeof obj.extension === 'string') return getEditorLanguage(obj.extension)

        if (typeof obj.filename === 'string') {
            const ext = obj.filename.split('.').pop() ?? ''
            return getEditorLanguage(ext)
        }

        for (const [key, value] of Object.entries(obj)) {
            if (typeof key === 'string' && key.includes('.')) {
                const ext = key.split('.').pop() ?? ''
                return getEditorLanguage(ext)
            }

            if (value && typeof value === 'object') {
                const nested = value as Record<string, unknown>
                if (typeof nested.filename === 'string') {
                    const ext = nested.filename.split('.').pop() ?? ''
                    return getEditorLanguage(ext)
                }
            }
        }
    }

    return 'typescript'
}

export function PlaygroundViewer({ playgroundId, token, readOnly = true }: PlaygroundViewerProps) {
    const [files, setFiles] = useState<SharedFile[]>([])
    const [activePath, setActivePath] = useState<string>('')
    const [playgroundName, setPlaygroundName] = useState<string>('Shared Playground')
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
    const [errorMsg, setErrorMsg] = useState<string>('')
    const monacoRef = useRef<Monaco | null>(null)

    const activeFile = files.find((file) => file.path === activePath) ?? files[0]
    const tree = buildFileTree(files)

    useEffect(() => {
        let cancelled = false

        async function fetchContent() {
            setStatus('loading')
            try {
                const res = await fetch(`/api/share/${token}/content`, { cache: 'no-store' })
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}))
                    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
                }
                const data: ContentResponse = await res.json()
                if (cancelled) return

                const extractedFiles = extractFiles(data.content)
                setFiles(extractedFiles)
                setActivePath((current) =>
                    current && extractedFiles.some((file) => file.path === current)
                        ? current
                        : extractedFiles[0]?.path ?? '',
                )
                if (data.name) setPlaygroundName(data.name)
                setStatus('ready')
            } catch (err) {
                if (cancelled) return
                setErrorMsg(err instanceof Error ? err.message : 'Failed to load')
                setStatus('error')
            }
        }

        void fetchContent()
        return () => { cancelled = true }
    }, [token])

    const handleEditorMount: OnMount = useCallback((_, monaco) => {
        monacoRef.current = monaco
        configureMonaco(monaco)
    }, [])

    const readOnlyOptions: MonacoEditor.IStandaloneEditorConstructionOptions = {
        ...(defaultEditorOptions as unknown as MonacoEditor.IStandaloneEditorConstructionOptions),
        rulers: [...(defaultEditorOptions.rulers ?? [])],
        readOnly: true,
        readOnlyMessage: { value: 'This playground is shared in view-only mode.' },
        domReadOnly: true,
        cursorBlinking: 'solid',
        cursorSmoothCaretAnimation: 'on',
        renderLineHighlight: 'none',
        occurrencesHighlight: 'singleFile',
        wordBasedSuggestions: 'currentDocument',
    }

    const renderTree = useCallback((nodes: FileTreeNode[], depth = 0): React.ReactNode => {
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
                        {node.children ? renderTree(node.children, depth + 1) : null}
                    </div>
                )
            }

            const isActive = activeFile?.path === node.path
            return (
                <button
                    key={node.path}
                    type="button"
                    onClick={() => setActivePath(node.path)}
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
    }, [activeFile?.path])

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
                        {readOnly && (
                            <div className="flex items-center gap-1.5 rounded-full bg-[#1e2028]/50 px-2.5 py-1 text-xs text-[#8ea5b5]">
                                <Lock size={12} />
                                <span>Read Only</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <Link
                            href="/dashboard"
                            className="rounded-md border border-[#1e2028] bg-[#11161d] px-3 py-1.5 text-xs text-[#8ea5b5] transition-colors hover:border-[#00d4aa]/30 hover:text-white"
                        >
                            Go to Dashboard
                        </Link>
                    </div>
                </div>

                {/* Editor area */}
                <div className="flex flex-1 overflow-hidden">
                    {status === 'loading' && (
                        <div className="flex flex-1 items-center justify-center">
                            <div className="flex flex-col items-center gap-3 text-[#8ea5b5]">
                                <Loader2 size={28} className="animate-spin text-[#00d4aa]" />
                                <p className="text-sm">Loading playground…</p>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-1 items-center justify-center">
                            <div className="flex flex-col items-center gap-3 text-center">
                                <AlertTriangle size={28} className="text-amber-400" />
                                <p className="text-sm font-medium text-white">Could not load playground</p>
                                <p className="text-xs text-[#8ea5b5]">{errorMsg}</p>
                            </div>
                        </div>
                    )}

                    {status === 'ready' && (
                        <>
                            <aside className="hidden w-64 shrink-0 border-r border-[#1e2028] bg-[#0c1117] md:flex md:flex-col">
                                <div className="border-b border-[#1e2028] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[#6f8193]">
                                    Files
                                </div>
                                <div className="min-h-0 flex-1 overflow-y-auto py-2">{renderTree(tree)}</div>
                            </aside>

                            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                                <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-[#1e2028] bg-[#0f141b] px-2 py-1">
                                    {files.map((file) => {
                                        const isActive = activeFile?.path === file.path
                                        return (
                                            <button
                                                key={file.path}
                                                type="button"
                                                onClick={() => setActivePath(file.path)}
                                                className={`max-w-72 truncate rounded-md border px-2 py-1 text-[11px] transition-colors ${isActive
                                                    ? 'border-[#00d4aa]/35 bg-[#00d4aa]/12 text-[#d7e2f1]'
                                                    : 'border-[#1e2028] bg-[#11161d] text-[#8ea5b5] hover:text-white'
                                                    }`}
                                                title={file.path}
                                            >
                                                {file.path}
                                            </button>
                                        )
                                    })}
                                </div>

                                <div className="min-h-0 flex-1 overflow-hidden">
                                    <Editor
                                        height="100%"
                                        language={activeFile ? activeFile.language : detectLanguage(null)}
                                        value={activeFile ? activeFile.content : ''}
                                        theme="modern-dark"
                                        onMount={handleEditorMount}
                                        options={readOnlyOptions}
                                        path={`viewer-${playgroundId}-${activeFile?.path ?? 'main.ts'}`}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </SidebarInset>
        </div>
    )
}
