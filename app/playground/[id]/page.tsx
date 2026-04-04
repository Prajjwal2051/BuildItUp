"use client"
// This page renders the main playground interface for a given template ID. It loads the template data, manages local state for the file tree and open files, and handles all file operations (add/rename/delete) while keeping the server in sync.

import React from "react"
import { useParams } from "next/navigation"
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
import { TerminalSquare, X, GripHorizontal } from "lucide-react"
import useFileExplorerStore, { type OpenFile } from "@/modules/playground/hooks/useFileExplorer"

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
    const id = Array.isArray(params.id) ? (params.id[0] ?? "") : (params.id ?? "")
    const { playgroundData, templateData, isLoading, error, saveTemplateData } = usePlayground(id)
    const [isTerminalOpen, setIsTerminalOpen] = React.useState(false)
    const [terminalHeight, setTerminalHeight] = React.useState(220)
    const [isPreviewOpen, setIsPreviewOpen] = React.useState(true)
    const [terminalLogs, setTerminalLogs] = React.useState<string[]>([])
    const hasLoggedTerminalAttach = React.useRef(false)
    const editorInstanceRef = React.useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
    const fileTree = useFileExplorerStore((state) => state.fileTree)
    const openFiles = useFileExplorerStore((state) => state.openFiles)
    const activeFilePath = useFileExplorerStore((state) => state.activeFileId ?? "")
    const editorContent = useFileExplorerStore((state) => state.editorContent)
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
    const hasUnsaved = openFiles.some((file) => file.hasUnsavedChanges)
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

    const handleSaveAll = React.useCallback(() => {
        if (!fileTree) return

        const dirtyFiles = openFiles.filter((file) => file.hasUnsavedChanges)
        if (dirtyFiles.length === 0) return

        const draft = cloneTree(fileTree)
        for (const file of dirtyFiles) {
            updateNodeByPath(draft, file.id, (target) => {
                target.content = file.content
            })
        }

        const rebuilt = rebuildPaths(draft, ".")
        setTemplateFileTree(rebuilt)
        void saveTemplateData(rebuilt)
        dirtyFiles.forEach((file) => saveFileChanges(file.id))
    }, [fileTree, openFiles, saveFileChanges, saveTemplateData, setTemplateFileTree])

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

    // Re-layouts Monaco when workspace panels change size so minimap and viewport stay aligned.
    React.useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            editorInstanceRef.current?.layout()
        })
        return () => {
            window.cancelAnimationFrame(frame)
        }
    }, [terminalHeight, isTerminalOpen, isPreviewOpen])

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

    // Captures the editor instance so we can force manual layout during panel resizing.
    const handleEditorMount = React.useCallback((editor: MonacoEditor.IStandaloneCodeEditor, monaco: Monaco) => {
        editorInstanceRef.current = editor
        configureMonaco(monaco)
    }, [])

    const handleFileChange = React.useCallback((filePath: string, newContent: string) => {
        markFileAsUnsaved(filePath, newContent)
    }, [markFileAsUnsaved])

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
                    <div className="w-22" />
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
                            onClick={() => setIsPreviewOpen((prev) => !prev)}
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
                            onClick={() => setIsTerminalOpen((prev) => !prev)}
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
                                : "block"
                        )}
                    >
                        <div className="min-h-0 flex-1 overflow-auto">
                            {activeFilePath ? (
                                <Editor
                                    key={activeFilePath}
                                    language={getEditorLanguage(activeFilePath.split(".").pop() ?? "")}
                                    value={editorContent}
                                    onChange={(value) => handleFileChange(activeFilePath, value ?? "")}
                                    theme="modern-dark"
                                    options={{
                                        ...(defaultEditorOptions as unknown as MonacoEditor.IStandaloneEditorConstructionOptions),
                                        automaticLayout: true,
                                    }}
                                    onMount={(editor, monaco) => handleEditorMount(editor, monaco)}
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm text-[#5c6370]">
                                    No file open
                                </div>
                            )}
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
