"use client"
// This page renders one playground workspace with explorer, editor, preview, and terminal.

import React from "react"
import { useParams, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TerminalSquare, X, GripHorizontal, House, Settings } from "lucide-react"
import useFileExplorerStore, { type OpenFile } from "@/modules/playground/hooks/useFileExplorer"

// Clones the full tree so updates remain immutable.
function cloneTree(node: FileTreeNode): FileTreeNode {
    return {
        ...node,
        children: node.children?.map(cloneTree),
    }
}

// Builds child paths using the root-dot format used by template payloads.
function toChildPath(parentPath: string, childName: string): string {
    return parentPath === "." ? childName : `${parentPath}/${childName}`
}

// Recomputes tree paths after edits so all nodes stay addressable.
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

// Finds a node by path so we can open specific files after load or click.
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

// Returns the first file path in the tree so the editor starts with visible content.
function findFirstFilePath(node: FileTreeNode): string {
    if (node.type === "file") return node.path
    for (const child of node.children ?? []) {
        const first = findFirstFilePath(child)
        if (first) return first
    }
    return ""
}

// Updates a node in place by path and reports whether a match was found.
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

// Converts the explorer tree into the shape expected by WebContainer preview.
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

// Reads persisted preferences and guards against malformed storage values.
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
                                "group flex shrink-0 cursor-pointer select-none items-center gap-2 border-r border-[#1c1f26] px-4 py-2 font-mono text-[12px] transition-colors",
                                isActive
                                    ? "border-t-2 border-t-[#61afef] bg-[#141821] text-white"
                                    : "text-[#5c6370] hover:bg-[#151922] hover:text-[#aab1bf]"
                            )}
                        >
                            {isDirty ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#e5c07b]" /> : null}
                            <span>{getFileName(file.id)}</span>
                            <button
                                onClick={(event) => {
                                    event.stopPropagation()
                                    onClose(file.id)
                                }}
                                className={cn(
                                    "flex h-4 w-4 items-center justify-center rounded text-[11px] transition-colors",
                                    isActive
                                        ? "text-[#5c6370] hover:bg-[#2a2f3a] hover:text-white"
                                        : "text-[#5c6370] opacity-0 hover:bg-[#2a2f3a] hover:text-white group-hover:opacity-100"
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
                        "flex h-7 w-7 items-center justify-center rounded transition-colors",
                        activeFilePath && hasUnsaved
                            ? "text-[#aab1bf] hover:bg-[#1b2130] hover:text-white"
                            : "cursor-not-allowed text-[#3a3f4b]"
                    )}
                >
                    S
                </button>

                <button
                    onClick={onSaveAll}
                    title="Save All (Ctrl+Shift+S)"
                    disabled={!hasUnsaved}
                    className={cn(
                        "flex h-7 w-7 items-center justify-center rounded transition-colors",
                        hasUnsaved
                            ? "text-[#aab1bf] hover:bg-[#1b2130] hover:text-white"
                            : "cursor-not-allowed text-[#3a3f4b]"
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
    const id = Array.isArray(params.id) ? (params.id[0] ?? "") : (params.id ?? "")
    const { playgroundData, templateData, isLoading, error, saveTemplateData } = usePlayground(id)

    const [isTerminalOpen, setIsTerminalOpen] = React.useState(false)
    const [terminalHeight, setTerminalHeight] = React.useState(220)
    const [isPreviewOpen, setIsPreviewOpen] = React.useState(true)
    const [terminalLogs, setTerminalLogs] = React.useState<string[]>([])
    const [isSettingsDialogOpen, setIsSettingsDialogOpen] = React.useState(false)
    const [isNavigatingHome, setIsNavigatingHome] = React.useState(false)
    const [editorPreferences, setEditorPreferences] = React.useState<EditorPreferences>(DEFAULT_EDITOR_PREFERENCES)
    const editorInstanceRef = React.useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
    const liveSyncTimersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

    const fileTree = useFileExplorerStore((state) => state.fileTree)
    const openFiles = useFileExplorerStore((state) => state.openFiles)
    const activeFilePath = useFileExplorerStore((state) => state.activeFileId ?? "")
    const setPlaygroundId = useFileExplorerStore((state) => state.setPlaygroundId)
    const setTemplateFileTree = useFileExplorerStore((state) => state.setTemplateFileTree)
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
    const activeOpenFile = React.useMemo(() => openFiles.find((file) => file.id === activeFilePath) ?? null, [activeFilePath, openFiles])
    const activeEditorContent = activeOpenFile?.content ?? ""
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

    const { serverUrl, isLoading: isWebContainerLoading, error: webContainerError, instance, useWriteFileSync, destroy } = useWebContainer({
        templateData: templateData as never,
    })

    const playgroundTitle =
        (typeof playgroundData?.title === "string" && playgroundData.title.trim()) ||
        (typeof templateData?.name === "string" && templateData.name.trim()) ||
        "Untitled Playground"

    // Loads the current template tree into the file explorer store and opens the first file.
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

    // Restores persisted editor preferences on first client render.
    React.useEffect(() => {
        const stored = window.localStorage.getItem(EDITOR_PREFERENCES_STORAGE_KEY)
        setEditorPreferences(parseEditorPreferences(stored))
    }, [])

    // Persists preferences and applies app theme whenever settings change.
    React.useEffect(() => {
        window.localStorage.setItem(EDITOR_PREFERENCES_STORAGE_KEY, JSON.stringify(editorPreferences))
        setTheme(editorPreferences.theme)
        editorInstanceRef.current?.layout()
    }, [editorPreferences, setTheme])

    // Clears pending live-sync timers when the component unmounts.
    React.useEffect(() => {
        return () => {
            for (const timer of liveSyncTimersRef.current.values()) {
                clearTimeout(timer)
            }
            liveSyncTimersRef.current.clear()
        }
    }, [])

    // Saves the active file content back into the tree and clears dirty state for that file.
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

        const rebuilt = rebuildPaths(draft, ".")
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
            router.push("/dashboard")
        } finally {
            setIsNavigatingHome(false)
        }
    }, [handleSaveAll, isNavigatingHome, router])

    React.useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (!event.ctrlKey && !event.metaKey) return
            if (event.key === "s" || event.key === "S") {
                event.preventDefault()
                if (event.shiftKey) {
                    void handleSaveAll()
                } else {
                    handleSave()
                }
            }
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
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

    const handleTogglePreview = React.useCallback(() => {
        setIsPreviewOpen((previous) => !previous)
    }, [])

    const handleToggleTerminal = React.useCallback(() => {
        setIsTerminalOpen((previous) => !previous)
    }, [])

    // Handles dragging to resize the terminal panel height.
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

    const handleEditorMount = React.useCallback((editor: MonacoEditor.IStandaloneCodeEditor, monaco: Monaco) => {
        editorInstanceRef.current = editor
        configureMonaco(monaco)
    }, [])

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
                    onAddFile={handleAddFile}
                    onAddFolder={handleAddFolder}
                    onDeleteFile={handleDeleteFile}
                    onDeleteFolder={handleDeleteFolder}
                    onRenameFile={handleRenameFile}
                    onRenameFolder={handleRenameFolder}
                />
            ) : null}

            <SidebarInset className="flex flex-1 flex-col overflow-hidden">
                <div className="flex shrink-0 items-center justify-between border-b border-[#1c1f26] bg-[#0f1115] px-4 py-2">
                    <div className="w-24" />
                    <div className="flex w-2xl items-center justify-center gap-2 rounded-md border border-[#2a2f3a] bg-[#141821] px-3 py-1">
                        <span className="select-none text-[11px] font-semibold uppercase tracking-widest text-[#5c6370]">Playground</span>
                        <span className="font-mono text-[13px] font-medium text-[#aab1bf]">{playgroundTitle}</span>
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
                                    : "border-[#2a2f3a] bg-[#141821] text-[#8b92a3] hover:border-[#3a4150] hover:text-white"
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
                                    : "border-[#2a2f3a] bg-[#141821] text-[#8b92a3] hover:border-[#3a4150] hover:text-white"
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
                                    : "border-[#2a2f3a] bg-[#141821] text-[#8b92a3] hover:border-[#3a4150] hover:text-white"
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

                <div className="flex min-h-0 flex-1 flex-col bg-[#0f1115]">
                    <div className={cn("min-h-0 flex-1", runtimeTemplate ? "flex flex-row" : "flex flex-col")}>
                        <div className="min-h-0 flex flex-1 flex-col overflow-hidden">
                            <div className="flex h-10 min-h-10 items-center justify-between border-b border-[#1c1f26] bg-[#0b0d11] px-3">
                                <div className="flex items-center gap-2 text-[11px] text-[#5c6370]">
                                    <span>Editor</span>
                                    <span className="text-[#7d8596]">{activeOpenFile ? getFileName(activeOpenFile.id) : "No file open"}</span>
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
                                        onMount={(editor, monaco) => handleEditorMount(editor, monaco)}
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-[#5c6370]">No file open</div>
                                )}
                            </div>
                        </div>

                        {runtimeTemplate ? (
                            <div
                                className={cn(
                                    "min-h-0 shrink-0 overflow-hidden bg-[#0f1115] transition-[width,border-color,opacity] duration-200",
                                    isPreviewOpen
                                        ? "w-[45%] border-l border-[#1c1f26] opacity-100"
                                        : "pointer-events-none w-0 border-l border-transparent opacity-0"
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
                                            onClick={() => setEditorPreferences((previous) => ({ ...previous, theme: "dark" }))}
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
                                            onClick={() => setEditorPreferences((previous) => ({ ...previous, theme: "light" }))}
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
                                            setEditorPreferences((previous) => ({ ...previous, fontSize: nextSize }))
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
                                            setEditorPreferences((previous) => ({ ...previous, fontFamily: nextFamily }))
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

                            <div className="h-[calc(100%-44px)] min-h-0 px-3 py-2 font-mono text-xs text-[#7d8596]">
                                <PlaygroundTerminal logs={terminalLogs} className="h-full min-h-0" />
                            </div>
                        </div>
                    ) : null}
                </div>
            </SidebarInset>
        </div>
    )
}

export default MainPlaygroundPage
