// This file defines a custom React hook called `usePlayground` that manages the state and logic for a playground feature in a web application. The hook provides functionality to load playground data, save template data, and handle loading and error states. It uses TypeScript for type safety and the `sonner` library for displaying toast notifications.

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import type { FileTreeNode } from '../lib/path-to-json'

// Options for the pathToJson function, which converts a file or folder path into a JSON tree. These options allow you to include file content, set a maximum depth for recursion, specify the encoding for reading files, and define patterns to ignore certain files or directories.
interface PlaygroundData {
    id: string
    title?: string
    [key: string]: unknown
}
// The return type of the `usePlayground` hook, which includes the playground data, template data, loading state, error message, and functions to load the playground and save template data. This interface helps to ensure that the hook's return value is consistent and type-safe.
interface UsePlaygroundReturn {
    playgroundData: PlaygroundData | null
    templateData: FileTreeNode | null
    isLoading: boolean
    error: string | null
    loadPlayground: () => Promise<void>
    saveTemplateData: (data: FileTreeNode) => Promise<void>
}

type FileSnapshot = {
    path?: unknown
    content?: unknown
    filename?: unknown
    extension?: unknown
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
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function isFileTreeNode(value: unknown): value is FileTreeNode {
    if (!isRecord(value)) return false
    if (typeof value.name !== 'string') return false
    if (typeof value.path !== 'string') return false
    return value.type === 'directory' || value.type === 'file'
}

function coerceTemplateNode(value: unknown, fallbackPath = '.'): FileTreeNode | null {
    if (!isRecord(value)) return null

    const nodeType = value.type
    const normalizedType = nodeType === 'folder' ? 'directory' : nodeType
    if (normalizedType !== 'directory' && normalizedType !== 'file') return null

    const nodeName = typeof value.name === 'string' && value.name.trim() ? value.name : 'root'
    const nodePath = typeof value.path === 'string' && value.path.trim() ? value.path : fallbackPath

    if (normalizedType === 'file') {
        return {
            name: nodeName,
            path: nodePath,
            type: 'file',
            content: toFileContent(value.content),
        }
    }

    const childValues = Array.isArray(value.children) ? value.children : []
    const children = childValues
        .map((child) => {
            const childName = isRecord(child) && typeof child.name === 'string' ? child.name : 'item'
            const childPath = nodePath === '.' ? childName : `${nodePath}/${childName}`
            return coerceTemplateNode(child, childPath)
        })
        .filter((child): child is FileTreeNode => child !== null)

    return {
        name: nodeName,
        path: nodePath,
        type: 'directory',
        children,
    }
}

function parseMaybeNestedJson(value: unknown): unknown {
    let current = value

    for (let i = 0; i < 5; i += 1) {
        if (typeof current !== 'string') return current
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

function normalizePath(pathLike: string): string {
    return pathLike.replace(/^\/+/, '').replace(/\\/g, '/').trim()
}

function toFileContent(value: unknown): string {
    if (typeof value === 'string') return value
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
}

function toTemplateTreeFromFiles(files: FileSnapshot[]): FileTreeNode | null {
    const root: FileTreeNode = {
        name: 'playground',
        path: '.',
        type: 'directory',
        children: [],
    }

    for (const entry of files) {
        const pathFromPath = typeof entry.path === 'string' ? normalizePath(entry.path) : ''
        const pathFromName =
            typeof entry.filename === 'string'
                ? `${normalizePath(entry.filename)}${typeof entry.extension === 'string' && entry.extension.trim() ? `.${entry.extension.trim().replace(/^\.+/, '')}` : ''}`
                : ''
        const normalizedPath = pathFromPath || pathFromName
        if (!normalizedPath) continue

        const segments = normalizedPath.split('/').filter(Boolean)
        if (segments.length === 0) continue

        let cursor = root
        let currentPath = '.'

        for (let i = 0; i < segments.length; i += 1) {
            const segment = segments[i]
            const isFile = i === segments.length - 1
            currentPath = currentPath === '.' ? segment : `${currentPath}/${segment}`

            if (!cursor.children) cursor.children = []

            let child = cursor.children.find(
                (node) => node.name === segment && node.type === (isFile ? 'file' : 'directory'),
            )

            if (!child) {
                child = {
                    name: segment,
                    path: currentPath,
                    type: isFile ? 'file' : 'directory',
                    children: isFile ? undefined : [],
                    content: isFile ? toFileContent(entry.content) : undefined,
                }
                cursor.children.push(child)
            }

            if (!isFile) cursor = child
        }
    }

    return root.children && root.children.length > 0 ? root : null
}

function normalizeTemplateTree(value: unknown): FileTreeNode | null {
    const parsed = parseMaybeNestedJson(value)
    const coercedRoot = coerceTemplateNode(parsed)
    if (coercedRoot) return coercedRoot

    const runtimeTree = fromRuntimeTemplate(parsed)
    if (runtimeTree) return runtimeTree

    if (isFileTreeNode(parsed)) {
        return parsed
    }

    if (Array.isArray(parsed)) {
        return toTemplateTreeFromFiles(parsed as FileSnapshot[])
    }

    if (!isRecord(parsed)) {
        return null
    }

    const coercedContent = coerceTemplateNode(parsed.content)
    if (coercedContent) {
        return coercedContent
    }

    if (Array.isArray(parsed.files)) {
        const fromFiles = toTemplateTreeFromFiles(parsed.files as FileSnapshot[])
        if (fromFiles) return fromFiles
    }

    if (parsed.content !== undefined) {
        return normalizeTemplateTree(parsed.content)
    }

    return null
}

function fromRuntimeTemplateItem(
    item: RuntimeTemplateItem,
    parentPath: string,
): FileTreeNode | null {
    const folderName =
        typeof item.folderName === 'string' && item.folderName.trim()
            ? item.folderName.trim()
            : ''

    if (folderName) {
        const folderPath = parentPath === '.' ? folderName : `${parentPath}/${folderName}`
        const rawChildren = Array.isArray(item.items) ? item.items : []
        const children = rawChildren
            .map((child) => fromRuntimeTemplateItem(child as RuntimeTemplateItem, folderPath))
            .filter((child): child is FileTreeNode => child !== null)

        return {
            name: folderName,
            path: folderPath,
            type: 'directory',
            children,
        }
    }

    const baseName =
        typeof item.filename === 'string' && item.filename.trim() ? item.filename.trim() : ''
    const ext =
        typeof item.fileExtension === 'string' && item.fileExtension.trim()
            ? item.fileExtension.trim().replace(/^\.+/, '')
            : ''
    if (!baseName) return null

    const fileName =
        ext && !baseName.toLowerCase().endsWith(`.${ext.toLowerCase()}`)
            ? `${baseName}.${ext}`
            : baseName
    const filePath = parentPath === '.' ? fileName : `${parentPath}/${fileName}`

    return {
        name: fileName,
        path: filePath,
        type: 'file',
        content: toFileContent(item.content),
    }
}

function fromRuntimeTemplate(value: unknown): FileTreeNode | null {
    if (!isRecord(value)) return null

    const root = value as RuntimeTemplateRoot
    const rootName =
        typeof root.folderName === 'string' && root.folderName.trim()
            ? root.folderName.trim()
            : 'playground'
    const rawItems = Array.isArray(root.items) ? root.items : null
    if (!rawItems) return null

    const children = rawItems
        .map((item) => fromRuntimeTemplateItem(item as RuntimeTemplateItem, '.'))
        .filter((child): child is FileTreeNode => child !== null)

    return {
        name: rootName,
        path: '.',
        type: 'directory',
        children,
    }
}

function usePlayground(playgroundId: string): UsePlaygroundReturn {
    const [playgroundData, setPlaygroundData] = useState<PlaygroundData | null>(null)
    const [templateData, setTemplateData] = useState<FileTreeNode | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Extracts a readable message from unknown errors without weakening type safety.
    const getErrorMessage = (value: unknown): string => {
        if (value instanceof Error && value.message) {
            return value.message
        }
        return 'An unexpected error occurred'
    }

    const loadPlayground = useCallback(async () => {
        // This function loads the playground data from the server using the provided playground ID. It sets the loading state to true, clears any previous errors, and makes a fetch request to the API endpoint for the playground. If the response is successful, it updates the playground data and template data in the state. If there is an error during the fetch operation, it catches the error and updates the error state with an appropriate message. Finally, it sets the loading state back to false regardless of the outcome.
        if (!playgroundId) {
            setError('No playground ID provided')
            return
        }
        try {
            setIsLoading(true)
            setError(null)
            const response = await fetch(`/api/playground/${playgroundId}`)
            if (!response.ok) {
                const message = await response.text()
                throw new Error(message || 'Failed to fetch playground data')
            }
            const data = await response.json()
            setPlaygroundData(data)

            // Template can come from the playground payload or from the dedicated template endpoint.
            const templateFromPlayground = normalizeTemplateTree(data.templateFile?.content)
            if (templateFromPlayground) {
                setTemplateData(templateFromPlayground)
            } else if (typeof data.code === 'string' && data.code.trim().length > 0) {
                // New playgrounds start from code snapshot, so parse it when templateFile is not created yet.
                const parsedCodeTemplate = normalizeTemplateTree(data.code)
                if (parsedCodeTemplate) {
                    setTemplateData(parsedCodeTemplate)
                } else {
                    setTemplateData(null)
                }
            } else {
                const templateResponse = await fetch(`/api/template/${playgroundId}`)
                if (templateResponse.ok) {
                    const templatePayload = await templateResponse.json()
                    const normalizedTemplate = normalizeTemplateTree(templatePayload.content ?? null)
                    setTemplateData(normalizedTemplate)
                } else {
                    setTemplateData(null)
                }
            }

            toast.success('Playground loaded successfully')
        } catch (error: unknown) {
            toast.error('Error loading playground')
            console.error('Error loading playground:', error)
            setPlaygroundData(null)
            setError(getErrorMessage(error))
        } finally {
            setIsLoading(false)
        }
    }, [playgroundId])

    // This function saves the updated template data for a specific playground. It takes the playground ID and the new template data as parameters, and it updates the corresponding template file in the database. If the playground does not exist, it can create a new entry. This action allows the client to persist changes made to the playground's template data.
    const saveTemplateData = useCallback(
        async (data: FileTreeNode) => {
            if (!playgroundId) {
                setError('No playground ID provided')
                return
            }

            try {
                setIsLoading(true)
                setError(null)

                const response = await fetch(`/api/template/${playgroundId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ content: data }),
                })

                if (!response.ok) {
                    throw new Error('Failed to save template data')
                }

                setTemplateData(data)
                toast.success('Template saved successfully')
            } catch (error: unknown) {
                toast.error('Error saving template')
                console.error('Error saving template:', error)
                setError(getErrorMessage(error))
            } finally {
                setIsLoading(false)
            }
        },
        [playgroundId],
    )

    // Auto-load once the hook receives a valid playground id.
    useEffect(() => {
        if (playgroundId) {
            void loadPlayground()
        }
    }, [playgroundId, loadPlayground])

    return {
        playgroundData,
        templateData,
        isLoading,
        error,
        loadPlayground,
        saveTemplateData,
    }
}

export default usePlayground
