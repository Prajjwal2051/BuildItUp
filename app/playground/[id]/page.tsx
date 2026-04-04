"use client"
// This page renders the main playground interface for a given template ID. It loads the template data, manages local state for the file tree and open files, and handles all file operations (add/rename/delete) while keeping the server in sync.

import React from "react"
import { useParams, useRouter } from "next/navigation"
import { SidebarInset } from "@/components/ui/sidebar"
import TemplateFileTree from "@/modules/playground/components/playground-explorer"
import usePlayground from "@/modules/playground/hooks/usePlayground"
import type { FileTreeNode } from "@/modules/playground/lib/path-to-json"
import { cn } from "@/lib/utils"
import Editor from "@monaco-editor/react"
import type { Monaco } from "@monaco-editor/react"
import type { editor as MonacoEditor } from "monaco-editor"
import { configureMonaco, defaultEditorOptions, getEditorLanguage } from "@/modules/playground/lib/editor-config"
import useWebContainer from "@/modules/webContainers/hooks/useWebContainer"
import WebContainerPreview from "@/modules/webContainers/components/webContainerPreview"
import PlaygroundTerminal from "@/modules/playground/components/playground-terminal"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import { TerminalSquare, X, GripHorizontal, Search, Command as CommandIcon, ArrowLeftRight, House, Settings } from "lucide-react"
import useFileExplorerStore, { type OpenFile } from "@/modules/playground/hooks/useFileExplorer"
import { useTheme } from "next-themes"

// Ensures names remain valid path segments for create and rename actions.
function sanitizeNodeName(name: string): string {
    return name.trim().replace(/[\\/]+/g, "")
}

// Builds child paths using the same dotted-root format returned by the template API.
function toChildPath(parentPath: string, childName: string): string {
    return parentPath === "." ? childName : `${parentPath}/${childName}`
}

// Clones the full tree so mutations stay immutable for React state updates.
function cloneTree(node: FileTreeNode): FileTreeNode {
    return {
        ...node,
        children: node.children?.map(cloneTree),
    }
}

// Recalculates all relative paths after mutations so add/rename/delete remain consistent.
function rebuildPaths(node: FileTreeNode, path = "."): FileTreeNode {
    const nextNode: FileTreeNode = { ...node, path }
    if (nextNode.type === "directory") {
        const children = nextNode.children ?? []
        nextNode.children = children.map((child) => {
            const childPath = toChildPath(path, child.name)
            return rebuildPaths(child, childPath)
        })
    }
    return nextNode
}

// Finds the node at a given path so the first file can be opened after load.
function findNodeByPath(node: FileTreeNode, targetPath: string): FileTreeNode | null {
    if (node.path === targetPath) {
        return node
    }
    if (node.type !== "directory") {
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

// Collects all file nodes so the quick open palette can search across the project.
function collectFileNodes(node: FileTreeNode | null, acc: FileTreeNode[] = []): FileTreeNode[] {
    if (!node) return acc
    if (node.type === "file") {
        acc.push(node)
        return acc
    }

    for (const child of node.children ?? []) {
        collectFileNodes(child, acc)
    }

    return acc
}

type SearchResult = {
    path: string
    name: string
    snippet: string
    lineNumber: number | null
    matchKind: "path" | "content"
}

type EditorMarkerInput = {
    message: string
    severity: number
    startLineNumber: number
    startColumn: number
    endLineNumber: number
    endColumn: number
    source?: string
    code?: string | number | { value: string }
}

type ProblemSeverity = "error" | "warning" | "info"

type ProblemEntry = {
    id: string
    path: string
    message: string
    detail: string
    severity: ProblemSeverity
    line: number | null
    column: number | null
    origin: "editor" | "terminal"
}

type EditorPreferences = {
    theme: "dark" | "light"
    fontSize: number
    fontFamily: string
}

const EDITOR_PREFERENCES_STORAGE_KEY = "playground-editor-preferences"
const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
    theme: "dark",
    fontSize: 14,
    fontFamily: "JetBrains Mono, Fira Code, Menlo, Monaco, monospace",
}

const EDITOR_FONT_FAMILY_OPTIONS = [
    { label: "JetBrains Mono", value: "JetBrains Mono, Fira Code, Menlo, Monaco, monospace" },
    { label: "Fira Code", value: "Fira Code, JetBrains Mono, Menlo, Monaco, monospace" },
    { label: "Source Code Pro", value: "Source Code Pro, Menlo, Monaco, monospace" },
    { label: "Menlo", value: "Menlo, Monaco, Consolas, monospace" },
]

// Loads persisted preferences and falls back to safe defaults when storage is missing or invalid.
function parseEditorPreferences(raw: string | null): EditorPreferences {
    if (!raw) return DEFAULT_EDITOR_PREFERENCES

    try {
        const parsed = JSON.parse(raw) as Partial<EditorPreferences>
        const theme = parsed.theme === "light" ? "light" : "dark"
        const fontSize = typeof parsed.fontSize === "number"
            ? Math.min(28, Math.max(11, Math.round(parsed.fontSize)))
            : DEFAULT_EDITOR_PREFERENCES.fontSize
        const fontFamily = typeof parsed.fontFamily === "string" && parsed.fontFamily.trim().length > 0
            ? parsed.fontFamily
            : DEFAULT_EDITOR_PREFERENCES.fontFamily

        return { theme, fontSize, fontFamily }
    } catch {
        return DEFAULT_EDITOR_PREFERENCES
    }
}

// Builds the current content map so search includes unsaved tab edits.
function buildCurrentFileContentMap(
    fileTree: FileTreeNode | null,
    openFiles: OpenFile[]
): Map<string, string> {
    const contentMap = new Map<string, string>()

    function walk(node: FileTreeNode | null) {
        if (!node) return
        if (node.type === "file") {
            contentMap.set(node.path, node.content ?? "")
            return
        }

        for (const child of node.children ?? []) {
            walk(child)
        }
    }

    walk(fileTree)

    for (const file of openFiles) {
        contentMap.set(file.id, file.content)
    }

    return contentMap
}

// Searches file names and file contents, then returns a small ranked result set.
function searchProjectFiles(
    query: string,
    fileTree: FileTreeNode | null,
    openFiles: OpenFile[]
): SearchResult[] {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return []

    const fileNodes = collectFileNodes(fileTree)
    const currentContentMap = buildCurrentFileContentMap(fileTree, openFiles)
    const results: SearchResult[] = []

    for (const file of fileNodes) {
        const content = currentContentMap.get(file.path) ?? file.content ?? ""
        const pathText = `${file.name} ${file.path}`.toLowerCase()
        const contentText = content.toLowerCase()
        const pathMatch = pathText.includes(normalizedQuery)
        const contentMatch = contentText.includes(normalizedQuery)

        if (!pathMatch && !contentMatch) {
            continue
        }

        let snippet = pathMatch ? "Filename or path match" : "Content match"
        let lineNumber: number | null = null

        if (contentMatch) {
            const lines = content.split(/\r?\n/)
            const lineIndex = lines.findIndex((line) => line.toLowerCase().includes(normalizedQuery))
            if (lineIndex >= 0) {
                lineNumber = lineIndex + 1
                const lineText = lines[lineIndex].trim()
                snippet = lineText.length > 160 ? `${lineText.slice(0, 157)}...` : lineText
            }
        }

        results.push({
            path: file.path,
            name: file.name,
            snippet,
            lineNumber,
            matchKind: pathMatch && !contentMatch ? "path" : "content",
        })
    }

    return results.slice(0, 50)
}

// Converts Monaco marker severities into the labels used by the problems panel.
function getProblemSeverity(severity: number): ProblemSeverity {
    if (severity >= 8) return "error"
    if (severity >= 4) return "warning"
    return "info"
}

// Turns editor markers into a normalized list that can be shown in the problems panel.
function normalizeEditorProblems(filePath: string, markers: EditorMarkerInput[]): ProblemEntry[] {
    return markers.map((marker, index) => ({
        id: `${filePath}-${marker.startLineNumber}-${marker.startColumn}-${index}`,
        path: filePath,
        message: marker.message,
        detail: marker.code ? String(typeof marker.code === "object" ? marker.code.value : marker.code) : marker.source ?? "Editor",
        severity: getProblemSeverity(marker.severity),
        line: marker.startLineNumber,
        column: marker.startColumn,
        origin: "editor",
    }))
}

// Extracts warning and error lines from the terminal output so runtime issues show up in the panel.
function collectTerminalProblems(terminalLogs: string[]): ProblemEntry[] {
    const problems: ProblemEntry[] = []

    terminalLogs.forEach((chunk, chunkIndex) => {
        chunk.split("\n").forEach((line, lineIndex) => {
            const normalized = line.trim()
            if (!normalized) return

            const severity = normalized.includes("[error]") || normalized.toLowerCase().includes("error")
                ? "error"
                : normalized.includes("[warn]") || normalized.toLowerCase().includes("warn")
                    ? "warning"
                    : null

            if (!severity) return

            problems.push({
                id: `terminal-${chunkIndex}-${lineIndex}-${normalized.slice(0, 24)}`,
                path: "Terminal",
                message: normalized,
                detail: "Runtime",
                severity,
                line: null,
                column: null,
                origin: "terminal",
            })
        })
    })

    return problems
}

function getProblemSeverityLabel(severity: ProblemSeverity): string {
    if (severity === "error") return "Error"
    if (severity === "warning") return "Warning"
    return "Info"
}

function getProblemSeverityClass(severity: ProblemSeverity): string {
    if (severity === "error") return "border-red-500/40 bg-red-500/10 text-red-300"
    if (severity === "warning") return "border-amber-500/40 bg-amber-500/10 text-amber-300"
    return "border-sky-500/40 bg-sky-500/10 text-sky-300"
}

// Returns the first file path to auto-select something meaningful after load.
function findFirstFilePath(node: FileTreeNode): string {
    if (node.type === "file") return node.path
    for (const child of node.children ?? []) {
        const first = findFirstFilePath(child)
        if (first) return first
    }
    return ""
}

// Updates one tree node by path and returns true when a node was modified.
function updateNodeByPath(
    node: FileTreeNode,
    targetPath: string,
    update: (target: FileTreeNode) => void
): boolean {
    if (node.path === targetPath) {
        update(node)
        return true
    }
    if (node.type !== "directory" || !node.children) return false
    return node.children.some((child) => updateNodeByPath(child, targetPath, update))
}

// Deletes one node by path and returns true when a child was removed.
function removeNodeByPath(node: FileTreeNode, targetPath: string): boolean {
    if (node.type !== "directory" || !node.children || targetPath === ".") return false
    const originalLength = node.children.length
    node.children = node.children.filter((child) => child.path !== targetPath)
    if (node.children.length !== originalLength) return true
    return node.children.some((child) => removeNodeByPath(child, targetPath))
}

function getFileName(filePath: string): string {
    return filePath.includes("/") ? filePath.slice(filePath.lastIndexOf("/") + 1) : filePath
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

// Converts the explorer tree into the runtime template shape expected by the WebContainer transformer.
function toRuntimeTemplate(tree: FileTreeNode | null): RuntimeTemplate | null {
    if (!tree || tree.type !== "directory") return null

    function toItem(node: FileTreeNode): RuntimeTemplateItem {
        if (node.type === "directory") {
            return {
                filename: "",
                fileExtension: "",
                content: "",
                folderName: node.name,
                items: (node.children ?? []).map(toItem),
            }
        }

        const dotIndex = node.name.lastIndexOf(".")
        const hasExtension = dotIndex > 0
        const filename = hasExtension ? node.name.slice(0, dotIndex) : node.name
        const fileExtension = hasExtension ? node.name.slice(dotIndex + 1) : ""

        return {
            filename,
            fileExtension,
            content: node.content ?? "",
        }
    }

    return {
        folderName: tree.name,
        items: (tree.children ?? []).map(toItem),
    }
}

// Renders a tab bar of all currently open files with close buttons.
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
            <div className="flex items-center overflow-x-auto scrollbar-none flex-1">
                {openFiles.map((file) => {
                    const isActive = file.id === activeFilePath
                    const isDirty = file.hasUnsavedChanges
                    return (
                        <div
                            key={file.id}
                            onClick={() => onSelect(file)}
                            className={cn(
                                "group flex items-center gap-2 px-4 py-2 text-[12px] font-mono cursor-pointer border-r border-[#1c1f26] shrink-0 select-none transition-colors",
                                isActive
                                    ? "bg-[#141821] text-white border-t-2 border-t-[#61afef]"
                                    : "text-[#5c6370] hover:bg-[#151922] hover:text-[#aab1bf]"
                            )}
                        >
                            {isDirty && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#e5c07b] shrink-0" />
                            )}
                            <span>{getFileName(file.id)}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onClose(file.id)
                                }}
                                className={cn(
                                    "rounded flex items-center justify-center w-4 h-4 text-[11px] transition-colors",
                                    isActive
                                        ? "text-[#5c6370] hover:text-white hover:bg-[#2a2f3a]"
                                        : "opacity-0 group-hover:opacity-100 text-[#5c6370] hover:text-white hover:bg-[#2a2f3a]"
                                )}
                            >
                                ✕
                            </button>
                        </div>
                    )
                })}
            </div>

            <div className="flex items-center gap-1 px-2 shrink-0 border-l border-[#1c1f26]">
                <button
                    onClick={onSave}
                    title="Save (Ctrl+S)"
                    disabled={!activeFilePath || !hasUnsaved}
                    className={cn(
                        "flex items-center justify-center w-7 h-7 rounded transition-colors",
                        activeFilePath && hasUnsaved
                            ? "text-[#aab1bf] hover:text-white hover:bg-[#1b2130]"
                            : "text-[#3a3f4b] cursor-not-allowed"
                    )}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                    </svg>
                </button>

                <button
                    onClick={onSaveAll}
                    title="Save All (Ctrl+Shift+S)"
                    disabled={!hasUnsaved}
                    className={cn(
                        "flex items-center justify-center w-7 h-7 rounded transition-colors",
                        hasUnsaved
                            ? "text-[#aab1bf] hover:text-white hover:bg-[#1b2130]"
                            : "text-[#3a3f4b] cursor-not-allowed"
                    )}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                        <line x1="21" y1="7" x2="23" y2="7" />
                        <line x1="21" y1="10" x2="23" y2="10" />
                        <line x1="21" y1="13" x2="23" y2="13" />
                    </svg>
                </button>
            </div>
        </div>
    )
}

// Renders a single playground workspace and keeps file-tree edits in sync with persistence.
function MainPlaygroundPage() {
    const params = useParams<{ id?: string | string[] }>()
    const router = useRouter()
    const { setTheme } = useTheme()
    const id = Array.isArray(params.id) ? (params.id[0] ?? "") : (params.id ?? "")
    const { playgroundData, templateData, isLoading, error, saveTemplateData } = usePlayground(id)
    const [isTerminalOpen, setIsTerminalOpen] = React.useState(false)
    const [terminalHeight, setTerminalHeight] = React.useState(220)
    const [isPreviewOpen, setIsPreviewOpen] = React.useState(true)
    const [terminalLogs, setTerminalLogs] = React.useState<string[]>([])
    const hasLoggedTerminalAttach = React.useRef(false)
    const editorInstancesRef = React.useRef<Array<MonacoEditor.IStandaloneCodeEditor | null>>([])
    const fileTree = useFileExplorerStore((state) => state.fileTree)
    const openFiles = useFileExplorerStore((state) => state.openFiles)
    const activeFilePath = useFileExplorerStore((state) => state.activeFileId ?? "")
    const editorContent = useFileExplorerStore((state) => state.editorContent)
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
    const hasUnsaved = openFiles.some((file) => file.hasUnsavedChanges)
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false)
    const [isSearchDialogOpen, setIsSearchDialogOpen] = React.useState(false)
    const [isSettingsDialogOpen, setIsSettingsDialogOpen] = React.useState(false)
    const [isNavigatingHome, setIsNavigatingHome] = React.useState(false)
    const [editorPreferences, setEditorPreferences] = React.useState<EditorPreferences>(DEFAULT_EDITOR_PREFERENCES)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [isSplitEditorOpen, setIsSplitEditorOpen] = React.useState(false)
    const [splitFilePath, setSplitFilePath] = React.useState("")
    const [isProblemsPanelOpen, setIsProblemsPanelOpen] = React.useState(false)
    const [editorProblemsByPath, setEditorProblemsByPath] = React.useState<Record<string, ProblemEntry[]>>({})
    const liveSyncTimersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
    const pendingRevealRef = React.useRef<{ path: string; line: number | null; column: number | null } | null>(null)
    const fileSearchItems = React.useMemo(() => collectFileNodes(fileTree), [fileTree])
    const searchResults = React.useMemo(() => searchProjectFiles(searchQuery, fileTree, openFiles), [searchQuery, fileTree, openFiles])
    const terminalProblems = React.useMemo(() => collectTerminalProblems(terminalLogs), [terminalLogs])
    const editorProblems = React.useMemo(() => Object.values(editorProblemsByPath).flat(), [editorProblemsByPath])
    const problems = React.useMemo(() => [...editorProblems, ...terminalProblems], [editorProblems, terminalProblems])
    const activeOpenFile = React.useMemo(() => openFiles.find((file) => file.id === activeFilePath) ?? null, [activeFilePath, openFiles])
    const splitOpenFile = React.useMemo(() => openFiles.find((file) => file.id === splitFilePath) ?? null, [openFiles, splitFilePath])
    const activeEditorContent = activeOpenFile?.content ?? editorContent
    const splitEditorContent = splitOpenFile?.content ?? ""
    const monacoTheme = editorPreferences.theme === "light" ? "vs" : "modern-dark"
    const editorOptions = React.useMemo(
        () => ({
            ...(defaultEditorOptions as unknown as MonacoEditor.IStandaloneEditorConstructionOptions),
            automaticLayout: true,
            fontSize: editorPreferences.fontSize,
            fontFamily: editorPreferences.fontFamily,
        }),
        [editorPreferences.fontFamily, editorPreferences.fontSize]
    )
    const runtimeTemplate = React.useMemo(() => toRuntimeTemplate(fileTree), [fileTree])
    const { serverUrl, isLoading: isWebContainerLoading, error: webContainerError, instance, useWriteFileSync, destroy } = useWebContainer({
        templateData: templateData as never,
    })

    const playgroundTitle =
        (typeof playgroundData?.title === "string" && playgroundData.title.trim()) ||
        (typeof templateData?.name === "string" && templateData.name.trim()) ||
        "Untitled Playground"

    React.useEffect(() => {
        setPlaygroundId(id)
        if (!templateData) {
            setTemplateFileTree(null)
            closeAllFiles()
            return
        }

        const normalizedTree = rebuildPaths(cloneTree(templateData), ".")
        setTemplateFileTree(normalizedTree)
        closeAllFiles()

        const firstFilePath = findFirstFilePath(normalizedTree)
        const firstFile = firstFilePath ? findNodeByPath(normalizedTree, firstFilePath) : null
        if (firstFile && firstFile.type === "file") {
            openFile(firstFile)
        }
    }, [closeAllFiles, id, openFile, setPlaygroundId, setTemplateFileTree, templateData])

    // Restores editor settings so the workspace always starts in the user's preferred style.
    React.useEffect(() => {
        const stored = window.localStorage.getItem(EDITOR_PREFERENCES_STORAGE_KEY)
        setEditorPreferences(parseEditorPreferences(stored))
    }, [])

    // Persists user settings and applies app theme mode whenever preferences change.
    React.useEffect(() => {
        window.localStorage.setItem(EDITOR_PREFERENCES_STORAGE_KEY, JSON.stringify(editorPreferences))
        setTheme(editorPreferences.theme)

        const frame = window.requestAnimationFrame(() => {
            for (const editor of editorInstancesRef.current) {
                editor?.layout()
            }
        })

        return () => window.cancelAnimationFrame(frame)
    }, [editorPreferences, setTheme])

    const handleSave = React.useCallback(() => {
        if (!activeFilePath || !fileTree) return

        const activeFile = openFiles.find((file) => file.id === activeFilePath)
        if (!activeFile) return

        const draft = cloneTree(fileTree)
        updateNodeByPath(draft, activeFilePath, (target) => {
            target.content = activeFile.content
        })

        const rebuilt = rebuildPaths(draft, ".")
        setTemplateFileTree(rebuilt)
        void saveTemplateData(rebuilt)
        saveFileChanges(activeFilePath)
    }, [activeFilePath, fileTree, openFiles, saveFileChanges, saveTemplateData, setTemplateFileTree])

    const handleSaveAll = React.useCallback(async () => {
        if (!fileTree) return

        const dirtyFiles = openFiles.filter((file) => file.hasUnsavedChanges)
        const draft = cloneTree(fileTree)
        for (const file of dirtyFiles) {
            updateNodeByPath(draft, file.id, (target) => {
                target.content = file.content
            })
        }

        const rebuilt = rebuildPaths(draft, ".")
        setTemplateFileTree(rebuilt)
        await saveTemplateData(rebuilt)
        dirtyFiles.forEach((file) => saveFileChanges(file.id))
    }, [fileTree, openFiles, saveFileChanges, saveTemplateData, setTemplateFileTree])

    // Saves pending edits, then routes back to dashboard from the header home action.
    const handleNavigateDashboard = React.useCallback(async () => {
        if (isNavigatingHome) return
        setIsNavigatingHome(true)
        try {
            await handleSaveAll()
            router.push("/dashboard")
        } finally {
            setIsNavigatingHome(false)
        }
    }, [handleSaveAll, isNavigatingHome, router])

    React.useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (!e.ctrlKey && !e.metaKey) return
            if (e.key === "s" || e.key === "S") {
                e.preventDefault()
                if (e.shiftKey) handleSaveAll()
                else handleSave()
            }
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [handleSave, handleSaveAll])

    // Appends WebContainer output to the terminal panel and keeps the list bounded.
    const appendTerminalLog = React.useCallback((message: string) => {
        if (!message) return
        setTerminalLogs((prev) => {
            const next = [...prev, message]
            return next.length > 400 ? next.slice(-400) : next
        })
    }, [])

    React.useEffect(() => {
        if (hasLoggedTerminalAttach.current) return
        hasLoggedTerminalAttach.current = true
        appendTerminalLog("[info] Playground terminal attached.\n")
    }, [appendTerminalLog])

    // Keeps the split editor pointed at an open file that still exists.
    React.useEffect(() => {
        if (!isSplitEditorOpen) return
        if (openFiles.length === 0) {
            setSplitFilePath("")
            return
        }

        const splitStillOpen = openFiles.some((file) => file.id === splitFilePath)
        if (splitStillOpen) return

        const nextSplitFile = openFiles.find((file) => file.id !== activeFilePath) ?? openFiles[0]
        if (nextSplitFile) {
            setSplitFilePath(nextSplitFile.id)
        }
    }, [activeFilePath, isSplitEditorOpen, openFiles, splitFilePath])

    // Reveals a requested line after Monaco has the right file mounted.
    React.useEffect(() => {
        const pending = pendingRevealRef.current
        if (!pending) return
        if (pending.path !== activeFilePath) return

        const frame = window.requestAnimationFrame(() => {
            const editor = editorInstancesRef.current[0]
            if (!editor) return
            if (pending.line) {
                editor.revealLineInCenter(pending.line)
                editor.setPosition({ lineNumber: pending.line, column: pending.column ?? 1 })
            }
            editor.focus()
            pendingRevealRef.current = null
        })

        return () => window.cancelAnimationFrame(frame)
    }, [activeFilePath])

    // Clears any pending live-sync writes when the page unloads or the component remounts.
    React.useEffect(() => {
        return () => {
            for (const timer of liveSyncTimersRef.current.values()) {
                clearTimeout(timer)
            }
            liveSyncTimersRef.current.clear()
        }
    }, [])

    // Drops stale problem entries when files close or rename so the panel stays relevant.
    React.useEffect(() => {
        const validPaths = new Set(openFiles.map((file) => file.id))
        setEditorProblemsByPath((previous) => {
            const next: Record<string, ProblemEntry[]> = {}
            for (const [path, entries] of Object.entries(previous)) {
                if (validPaths.has(path)) {
                    next[path] = entries
                }
            }
            return next
        })
    }, [openFiles])

    // Opens the command palette with the same shortcut users expect in an IDE.
    React.useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            const isProjectSearch = (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "f"
            if (isProjectSearch) {
                event.preventDefault()
                setIsSearchDialogOpen(true)
                return
            }
            const isQuickOpen = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p"
            if (!isQuickOpen) return
            event.preventDefault()
            setIsCommandPaletteOpen(true)
        }

        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [])

    // Re-layouts Monaco when workspace panels change size so minimap and viewport stay aligned.
    React.useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            for (const editor of editorInstancesRef.current) {
                editor?.layout()
            }
        })
        return () => {
            window.cancelAnimationFrame(frame)
        }
    }, [isPreviewOpen, isSplitEditorOpen, isTerminalOpen, terminalHeight])

    // Allows users to drag the terminal divider to resize the panel height.
    const handleTerminalResizeStart = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
        const startY = event.clientY
        const startHeight = terminalHeight

        function onMouseMove(moveEvent: MouseEvent) {
            const deltaY = startY - moveEvent.clientY
            const nextHeight = Math.max(140, Math.min(420, startHeight + deltaY))
            setTerminalHeight(nextHeight)
        }

        function onMouseUp() {
            window.removeEventListener("mousemove", onMouseMove)
            window.removeEventListener("mouseup", onMouseUp)
        }

        window.addEventListener("mousemove", onMouseMove)
        window.addEventListener("mouseup", onMouseUp)
    }, [terminalHeight])

    // Captures each editor instance so the page can keep every split pane aligned.
    const handleEditorMount = React.useCallback((slot: number, editor: MonacoEditor.IStandaloneCodeEditor, monaco: Monaco) => {
        editorInstancesRef.current[slot] = editor
        configureMonaco(monaco)
    }, [])

    // Stores diagnostics from Monaco so the problems panel can show syntax and type issues.
    const handleEditorValidate = React.useCallback((filePath: string, markers: EditorMarkerInput[]) => {
        setEditorProblemsByPath((previous) => {
            const next = { ...previous }
            const normalized = normalizeEditorProblems(filePath, markers)
            if (normalized.length === 0) {
                delete next[filePath]
            } else {
                next[filePath] = normalized
            }
            return next
        })
    }, [])

    const handleFileChange = React.useCallback((filePath: string, newContent: string) => {
        markFileAsUnsaved(filePath, newContent)
        const previousTimer = liveSyncTimersRef.current.get(filePath)
        if (previousTimer) {
            clearTimeout(previousTimer)
        }

        const timer = setTimeout(() => {
            void useWriteFileSync(filePath, newContent)
                .then(() => {
                    appendTerminalLog(`[info] Synced ${getFileName(filePath)} to the live preview.\n`)
                })
                .catch((syncError) => {
                    const message = syncError instanceof Error ? syncError.message : "Unknown sync error"
                    appendTerminalLog(`[error] Failed to sync ${filePath}: ${message}\n`)
                })
        }, 150)

        liveSyncTimersRef.current.set(filePath, timer)
    }, [appendTerminalLog, markFileAsUnsaved, useWriteFileSync])

    const handleFileSelect = React.useCallback((filePath: string, file: FileTreeNode) => {
        if (file.type !== "file") return
        openFile(file)
    }, [openFile])

    const handleCloseFile = React.useCallback((filePath: string) => {
        closeFile(filePath)
    }, [closeFile])

    const handleAddFile = React.useCallback((parentPath: string, filename: string, extension: string) => {
        addFile(parentPath, filename, extension)
    }, [addFile])

    const handleAddFolder = React.useCallback((parentPath: string, folderName: string) => {
        addFolder(parentPath, folderName)
    }, [addFolder])

    const handleDeleteFile = React.useCallback((filePath: string) => {
        deleteFile(filePath)
    }, [deleteFile])

    const handleDeleteFolder = React.useCallback((folderPath: string) => {
        deleteFolder(folderPath)
    }, [deleteFolder])

    const handleRenameFile = React.useCallback((filePath: string, filename: string, extension: string) => {
        renameFile(filePath, filename, extension)
    }, [renameFile])

    const handleRenameFolder = React.useCallback((folderPath: string, newFolderName: string) => {
        renameFolder(folderPath, newFolderName)
    }, [renameFolder])

    const handleOpenFileFromPalette = React.useCallback((file: FileTreeNode) => {
        if (file.type !== "file") return
        openFile(file)
        setIsCommandPaletteOpen(false)
    }, [openFile])

    const handleTogglePreview = React.useCallback(() => {
        setIsPreviewOpen((prev) => !prev)
        setIsCommandPaletteOpen(false)
    }, [])

    const handleToggleTerminal = React.useCallback(() => {
        setIsTerminalOpen((prev) => !prev)
        setIsCommandPaletteOpen(false)
    }, [])

    const handleToggleSplitEditor = React.useCallback(() => {
        setIsSplitEditorOpen((prev) => {
            const next = !prev
            if (next) {
                const fallbackSplitFile = openFiles.find((file) => file.id !== activeFilePath) ?? openFiles[0]
                if (fallbackSplitFile && !splitFilePath) {
                    setSplitFilePath(fallbackSplitFile.id)
                }
            }
            return next
        })
        setIsCommandPaletteOpen(false)
    }, [activeFilePath, openFiles, splitFilePath])

    const handleToggleProblemsPanel = React.useCallback(() => {
        setIsProblemsPanelOpen((prev) => !prev)
        setIsCommandPaletteOpen(false)
    }, [])

    const handleSwapSplitEditors = React.useCallback(() => {
        if (!isSplitEditorOpen || !splitFilePath || !activeFilePath || splitFilePath === activeFilePath) {
            return
        }

        const previousActive = activeFilePath
        setActiveFileId(splitFilePath)
        setSplitFilePath(previousActive)
    }, [activeFilePath, isSplitEditorOpen, setActiveFileId, splitFilePath])

    const handleOpenProblem = React.useCallback((problem: ProblemEntry) => {
        if (problem.origin === "editor" && fileTree) {
            const file = findNodeByPath(fileTree, problem.path)
            if (file && file.type === "file") {
                pendingRevealRef.current = { path: file.path, line: problem.line, column: problem.column }
                if (file.path === activeFilePath) {
                    window.requestAnimationFrame(() => {
                        const editor = editorInstancesRef.current[0]
                        const pending = pendingRevealRef.current
                        if (!editor || !pending || pending.path !== file.path) return
                        if (pending.line) {
                            editor.revealLineInCenter(pending.line)
                            editor.setPosition({ lineNumber: pending.line, column: pending.column ?? 1 })
                        }
                        editor.focus()
                        pendingRevealRef.current = null
                    })
                } else {
                    openFile(file)
                }
            }
        }
        setIsProblemsPanelOpen(true)
    }, [activeFilePath, fileTree, openFile])

    const handleOpenCommandPalette = React.useCallback(() => {
        setIsCommandPaletteOpen(true)
    }, [])

    const handleOpenSearchDialog = React.useCallback(() => {
        setIsSearchDialogOpen(true)
    }, [])

    const handleOpenSearchResult = React.useCallback((path: string) => {
        const file = fileTree ? findNodeByPath(fileTree, path) : null
        if (!file || file.type !== "file") return
        openFile(file)
        setIsSearchDialogOpen(false)
    }, [fileTree, openFile])

    const commandGroups = React.useMemo(() => {
        const openableFiles = fileSearchItems
            .slice()
            .sort((a, b) => a.path.localeCompare(b.path))

        return {
            files: openableFiles,
        }
    }, [fileSearchItems])

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
            {fileTree && (
                <TemplateFileTree
                    data={fileTree}
                    onFileSelect={handleFileSelect}
                    selectedFilePath={activeFilePath}
                    title="File Explorer"
                    onAddFile={handleAddFile}
                    onAddFolder={handleAddFolder}
                    onDeleteFile={handleDeleteFile}
                    onDeleteFolder={handleDeleteFolder}
                    onRenameFile={handleRenameFile}
                    onRenameFolder={handleRenameFolder}
                />
            )}

            <SidebarInset className="flex flex-col flex-1 overflow-hidden">
                {/* Header */}
                <div className="justify-between flex items-center px-4 py-2 border-b border-[#1c1f26] bg-[#0f1115] shrink-0">
                    <div className="w-24" />
                    <div className="justify-center w-2xl flex items-center gap-2 px-3 py-1 rounded-md border border-[#2a2f3a] bg-[#141821]">
                        <span className="text-[11px] tracking-widest uppercase text-[#5c6370] font-semibold select-none">
                            Playground
                        </span>
                        <span className="text-[#aab1bf] text-[13px] font-mono font-medium">
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
                                "flex h-9 w-9 items-center justify-center rounded-md border transition-colors",
                                isNavigatingHome
                                    ? "cursor-not-allowed border-[#2a2f3a] bg-[#141821] text-[#5c6370]"
                                    : "border-[#2a2f3a] bg-[#141821] text-[#8b92a3] hover:text-white hover:border-[#3a4150]"
                            )}
                        >
                            <House size={16} />
                        </button>

                        <button
                            type="button"
                            onClick={handleTogglePreview}
                            title={isPreviewOpen ? "Hide Preview" : "Show Preview"}
                            className={cn(
                                "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                                isPreviewOpen
                                    ? "border-[#61afef] bg-[#1b2130] text-[#dbe8ff]"
                                    : "border-[#2a2f3a] bg-[#141821] text-[#8b92a3] hover:text-white hover:border-[#3a4150]"
                            )}
                        >
                            Preview
                        </button>

                        <button
                            type="button"
                            onClick={handleToggleTerminal}
                            title={isTerminalOpen ? "Hide Terminal" : "Show Terminal"}
                            className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-md border transition-colors",
                                isTerminalOpen
                                    ? "border-[#61afef] bg-[#1b2130] text-[#dbe8ff]"
                                    : "border-[#2a2f3a] bg-[#141821] text-[#8b92a3] hover:text-white hover:border-[#3a4150]"
                            )}
                        >
                            <TerminalSquare size={16} />
                        </button>
                    </div>
                </div>

                <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
                    <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
                        <DialogHeader className="border-b px-4 py-3">
                            <DialogTitle>Search in files</DialogTitle>
                            <DialogDescription>
                                Search file names, paths, and file contents in the current playground.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="border-b px-4 py-3">
                            <Input
                                autoFocus
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Type to search across the project..."
                            />
                        </div>

                        <ScrollArea className="max-h-[60vh]">
                            <div className="space-y-2 p-3">
                                {searchQuery.trim() ? (
                                    searchResults.length > 0 ? (
                                        searchResults.map((result) => (
                                            <button
                                                key={`${result.path}-${result.lineNumber ?? "path"}`}
                                                type="button"
                                                onClick={() => handleOpenSearchResult(result.path)}
                                                className="w-full rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-muted/50"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-medium text-foreground">
                                                            {result.path}
                                                        </div>
                                                        <div className="truncate text-xs text-muted-foreground">
                                                            {result.snippet}
                                                        </div>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        <Badge variant="outline">{result.matchKind}</Badge>
                                                        {result.lineNumber ? (
                                                            <Badge variant="secondary">Line {result.lineNumber}</Badge>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="py-10 text-center text-sm text-muted-foreground">
                                            No matches found.
                                        </div>
                                    )
                                ) : (
                                    <div className="py-10 text-center text-sm text-muted-foreground">
                                        Start typing to search across file names and file contents.
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>

                <CommandDialog
                    open={isCommandPaletteOpen}
                    onOpenChange={setIsCommandPaletteOpen}
                    title="Quick Open"
                    description="Search files and run playground actions"
                    className="max-w-2xl"
                >
                    <Command className="rounded-xl! border border-border/60 bg-background shadow-2xl">
                        <CommandInput placeholder="Search files, actions, or commands..." />
                        <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>

                            <CommandGroup heading="Files">
                                {commandGroups.files.map((file) => (
                                    <CommandItem
                                        key={file.path}
                                        value={`${file.name} ${file.path}`}
                                        onSelect={() => handleOpenFileFromPalette(file)}
                                    >
                                        <span className="truncate">{file.path}</span>
                                        <CommandShortcut>Open</CommandShortcut>
                                    </CommandItem>
                                ))}
                            </CommandGroup>

                            <CommandSeparator />

                            <CommandGroup heading="Actions">
                                <CommandItem
                                    value="save current file"
                                    onSelect={() => {
                                        handleSave()
                                        setIsCommandPaletteOpen(false)
                                    }}
                                >
                                    Save file
                                    <CommandShortcut>Ctrl+S</CommandShortcut>
                                </CommandItem>
                                <CommandItem
                                    value="save all files"
                                    onSelect={() => {
                                        handleSaveAll()
                                        setIsCommandPaletteOpen(false)
                                    }}
                                >
                                    Save all
                                    <CommandShortcut>Ctrl+Shift+S</CommandShortcut>
                                </CommandItem>
                                <CommandItem value="toggle preview" onSelect={handleTogglePreview}>
                                    {isPreviewOpen ? "Hide preview" : "Show preview"}
                                    <CommandShortcut>Preview</CommandShortcut>
                                </CommandItem>
                                <CommandItem value="toggle terminal" onSelect={handleToggleTerminal}>
                                    {isTerminalOpen ? "Hide terminal" : "Show terminal"}
                                    <CommandShortcut>Terminal</CommandShortcut>
                                </CommandItem>
                                <CommandItem value="toggle split editor" onSelect={handleToggleSplitEditor}>
                                    {isSplitEditorOpen ? "Hide split editor" : "Show split editor"}
                                    <CommandShortcut>Split</CommandShortcut>
                                </CommandItem>
                                <CommandItem value="toggle problems panel" onSelect={handleToggleProblemsPanel}>
                                    {isProblemsPanelOpen ? "Hide problems panel" : "Show problems panel"}
                                    <CommandShortcut>Problems</CommandShortcut>
                                </CommandItem>
                                <CommandItem
                                    value="search in files"
                                    onSelect={() => {
                                        handleOpenSearchDialog()
                                        setIsCommandPaletteOpen(false)
                                    }}
                                >
                                    Search in files
                                    <CommandShortcut>Ctrl+Shift+F</CommandShortcut>
                                </CommandItem>
                                <CommandItem
                                    value="reset webcontainer"
                                    onSelect={() => {
                                        destroy()
                                        setIsCommandPaletteOpen(false)
                                    }}
                                >
                                    Reset web container
                                    <CommandShortcut>Danger</CommandShortcut>
                                </CommandItem>
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </CommandDialog>

                <OpenFilesTabs
                    openFiles={openFiles}
                    activeFilePath={activeFilePath}
                    onSelect={openFile}
                    onClose={handleCloseFile}
                    onSave={handleSave}
                    onSaveAll={handleSaveAll}
                />

                {/* Keeps code editor and terminal stacked in one workspace column. */}
                <div className="flex min-h-0 flex-1 flex-col bg-[#0f1115]">
                    {/* Switches preview layout so users can dock it to the right or bottom. */}
                    <div
                        className={cn(
                            "min-h-0 flex-1",
                            runtimeTemplate
                                ? "flex flex-row"
                                : "flex flex-col"
                        )}
                    >
                        <div className={cn("min-h-0 flex flex-1 overflow-hidden", isSplitEditorOpen ? "flex-row" : "flex-col")}>
                            <div className={cn("min-w-0 min-h-0 flex flex-1 flex-col overflow-hidden", isSplitEditorOpen ? "border-r border-[#1c1f26]" : "")}>
                                <div className="flex h-10 min-h-10 items-center justify-between border-b border-[#1c1f26] bg-[#0b0d11] px-3">
                                    <div className=" flex items-center gap-2 text-[11px] text-[#5c6370]">
                                        <span>Editor</span>
                                        <span className=" text-[#7d8596]">{activeOpenFile ? getFileName(activeOpenFile.id) : "No file open"}</span>
                                    </div>
                                    <span className="text-[10px] text-[#5c6370]">Primary</span>
                                </div>
                                <div className="min-h-0 flex-1 overflow-hidden">
                                    {activeOpenFile ? (
                                        <Editor
                                            path={activeFilePath}
                                            language={getEditorLanguage(activeFilePath.split(".").pop() ?? "")}
                                            value={activeEditorContent}
                                            onChange={(value) => handleFileChange(activeFilePath, value ?? "")}
                                            theme={monacoTheme}
                                            options={editorOptions}
                                            onMount={(editor, monaco) => handleEditorMount(0, editor, monaco)}
                                            onValidate={(markers) => handleEditorValidate(activeFilePath, markers as EditorMarkerInput[])}
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm text-[#5c6370]">
                                            No file open
                                        </div>
                                    )}
                                </div>
                            </div>

                            {isSplitEditorOpen ? (
                                <>
                                    <div className="flex w-10 min-w-10 items-center justify-center border-r border-[#1c1f26] bg-[#0b0d11]">
                                        <button
                                            type="button"
                                            onClick={handleSwapSplitEditors}
                                            className="flex h-7 w-7 items-center justify-center rounded-md border border-[#2a2f3a] text-[#aab1bf] transition-colors hover:border-[#3a4150] hover:text-white"
                                            title="Swap split panes"
                                            aria-label="Swap split panes"
                                        >
                                            <ArrowLeftRight size={13} />
                                        </button>
                                    </div>
                                    <div className="min-w-0 flex flex-1 flex-col overflow-hidden">
                                        <div className="flex h-10 min-h-10 items-center justify-between border-b border-[#1c1f26] bg-[#0b0d11] px-3">
                                            <div className="flex items-center gap-2 text-[11px] text-[#5c6370]">
                                                <span>Split Editor</span>
                                                <span className="text-[#7d8596]">Secondary view</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={splitFilePath}
                                                    onChange={(event) => setSplitFilePath(event.target.value)}
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
                                        <div className="min-h-0 flex-1 overflow-hidden">
                                            {splitOpenFile ? (
                                                <Editor
                                                    path={splitFilePath}
                                                    language={getEditorLanguage(splitFilePath.split(".").pop() ?? "")}
                                                    value={splitEditorContent}
                                                    onChange={(value) => handleFileChange(splitFilePath, value ?? "")}
                                                    theme={monacoTheme}
                                                    options={editorOptions}
                                                    onMount={(editor, monaco) => handleEditorMount(1, editor, monaco)}
                                                    onValidate={(markers) => handleEditorValidate(splitFilePath, markers as EditorMarkerInput[])}
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-sm text-[#5c6370]">
                                                    Pick a file to open in the split view.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </div>

                        {/* Keeps preview mounted so toggling visibility does not restart container setup. */}
                        {runtimeTemplate ? (
                            <div
                                className={cn(
                                    "min-h-0 shrink-0 overflow-hidden bg-[#0f1115] transition-[width,border-color,opacity] duration-200",
                                    isPreviewOpen
                                        ? "w-[45%] border-l border-[#1c1f26] opacity-100"
                                        : "w-0 border-l border-transparent opacity-0 pointer-events-none"
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
                                onClick={handleOpenSearchDialog}
                                className="flex h-7 items-center gap-1.5 rounded-md border border-[#2a2f3a] bg-[#141821] px-2.5 text-[11px] text-[#aab1bf] transition-colors hover:border-[#3a4150] hover:text-white"
                                title="Search in files"
                            >
                                <Search size={13} />
                                <span>Search</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleOpenCommandPalette}
                                className="flex h-7 items-center gap-1.5 rounded-md border border-[#2a2f3a] bg-[#141821] px-2.5 text-[11px] text-[#aab1bf] transition-colors hover:border-[#3a4150] hover:text-white"
                                title="Quick Open"
                            >
                                <CommandIcon size={13} />
                                <span>Quick Open</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleToggleSplitEditor}
                                className={cn(
                                    "flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11px] transition-colors",
                                    isSplitEditorOpen
                                        ? "border-[#61afef] bg-[#1b2130] text-[#dbe8ff]"
                                        : "border-[#2a2f3a] bg-[#141821] text-[#aab1bf] hover:border-[#3a4150] hover:text-white"
                                )}
                                title="Toggle split editor"
                            >
                                <span>Split</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleToggleProblemsPanel}
                                className={cn(
                                    "flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11px] transition-colors",
                                    isProblemsPanelOpen
                                        ? "border-[#61afef] bg-[#1b2130] text-[#dbe8ff]"
                                        : "border-[#2a2f3a] bg-[#141821] text-[#aab1bf] hover:border-[#3a4150] hover:text-white"
                                )}
                                title="Toggle problems panel"
                            >
                                <span>Problems</span>
                            </button>

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
                                    Choose your preferred editor theme, font size, and font family.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 pt-1">
                                <div className="space-y-2">
                                    <div className="text-sm font-medium">Theme</div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setEditorPreferences((prev) => ({ ...prev, theme: "dark" }))}
                                            className={cn(
                                                "h-8 rounded-md border px-3 text-xs transition-colors",
                                                editorPreferences.theme === "dark"
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-border text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            Dark
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditorPreferences((prev) => ({ ...prev, theme: "light" }))}
                                            className={cn(
                                                "h-8 rounded-md border px-3 text-xs transition-colors",
                                                editorPreferences.theme === "light"
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-border text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            Light
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm font-medium">
                                        <span>Font Size</span>
                                        <span className="text-xs text-muted-foreground">{editorPreferences.fontSize}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={11}
                                        max={28}
                                        step={1}
                                        value={editorPreferences.fontSize}
                                        onChange={(event) => {
                                            const nextSize = Number(event.target.value)
                                            setEditorPreferences((prev) => ({ ...prev, fontSize: nextSize }))
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
                                            setEditorPreferences((prev) => ({ ...prev, fontFamily: nextFamily }))
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

                    {isProblemsPanelOpen ? (
                        <div className="shrink-0 border-t border-[#1c1f26] bg-[#0b0d11]">
                            <div className="flex items-center justify-between border-b border-[#1c1f26] px-3 py-2">
                                <div className="flex items-center gap-2 text-[12px] text-[#aab1bf]">
                                    <span className="font-medium">Problems</span>
                                    <span className="text-[#5c6370]">{problems.length}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsProblemsPanelOpen(false)}
                                    className="rounded p-1 text-[#71798a] hover:bg-[#151922] hover:text-white"
                                    aria-label="Close problems panel"
                                    title="Close problems panel"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <ScrollArea className="max-h-56">
                                <div className="space-y-2 p-3">
                                    {problems.length > 0 ? (
                                        problems.map((problem) => (
                                            <button
                                                key={problem.id}
                                                type="button"
                                                onClick={() => handleOpenProblem(problem)}
                                                className="w-full rounded-lg border border-[#1c1f26] bg-[#11141a] px-3 py-2 text-left transition-colors hover:border-[#2a2f3a] hover:bg-[#141821]"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className={getProblemSeverityClass(problem.severity)}>
                                                                {getProblemSeverityLabel(problem.severity)}
                                                            </Badge>
                                                            <span className="truncate text-sm font-medium text-[#dbe8ff]">
                                                                {problem.path}
                                                            </span>
                                                        </div>
                                                        <div className="mt-1 text-xs text-[#aab1bf]">
                                                            {problem.message}
                                                        </div>
                                                        <div className="mt-1 text-[11px] text-[#5c6370]">
                                                            {problem.detail}
                                                            {problem.line ? ` · Line ${problem.line}` : ""}
                                                            {problem.column ? `:${problem.column}` : ""}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="py-10 text-center text-sm text-muted-foreground">
                                            No problems found.
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    ) : null}

                    {isTerminalOpen ? (
                        <div className="shrink-0 border-t border-[#1c1f26] bg-[#0b0d11]" style={{ height: `${terminalHeight}px` }}>
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

                            <div className="min-h-0 h-[calc(100%-44px)] px-3 py-2 font-mono text-xs text-[#7d8596]">
                                <PlaygroundTerminal
                                    logs={terminalLogs}
                                    className="h-full min-h-0"
                                />
                            </div>
                        </div>
                    ) : null}
                </div>
            </SidebarInset>
        </div>
    )
}

export default MainPlaygroundPage
