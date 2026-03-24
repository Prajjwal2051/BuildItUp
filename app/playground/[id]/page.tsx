"use client"
// This page renders the main playground interface for a given template ID. It loads the template data, manages local state for the file tree and open files, and handles all file operations (add/rename/delete) while keeping the server in sync.

import React from "react"
import { useParams } from "next/navigation"
import { SidebarInset } from "@/components/ui/sidebar"
import TemplateFileTree from "@/modules/playground/components/playground-explorer"
import usePlayground from "@/modules/playground/hooks/usePlayground"
import type { FileTreeNode } from "@/modules/playground/lib/path-to-json"
import { cn } from "@/lib/utils"

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

// Returns the first file path to auto-select something meaningful after load.
function findFirstFilePath(node: FileTreeNode): string {
    if (node.type === "file") return node.path
    for (const child of node.children ?? []) {
        const first = findFirstFilePath(child)
        if (first) return first
    }
    return ""
}

// Walks the tree and returns the content string of the node at the given path.
function getFileContent(node: FileTreeNode, targetPath: string): string {
    if (node.path === targetPath && node.type === "file") {
        return node.content ?? ""
    }
    for (const child of node.children ?? []) {
        const found = getFileContent(child, targetPath)
        if (found !== null) return found
    }
    return ""
}

// Walks the tree and collects { path -> content } for every file node.
function extractAllFileContents(node: FileTreeNode, acc: Record<string, string> = {}): Record<string, string> {
    if (node.type === "file") {
        acc[node.path] = node.content ?? ""
    }
    for (const child of node.children ?? []) {
        extractAllFileContents(child, acc)
    }
    return acc
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

// Renders a tab bar of all currently open files with close buttons.
function OpenFilesTabs({
    openFiles,
    activeFilePath,
    unsavedFiles,
    onSelect,
    onClose,
    onSave,
    onSaveAll,
}: {
    openFiles: string[]
    activeFilePath: string
    unsavedFiles: Set<string>
    onSelect: (path: string) => void
    onClose: (path: string) => void
    onSave: () => void
    onSaveAll: () => void
}) {
    if (openFiles.length === 0) return null
    const hasUnsaved = unsavedFiles.size > 0

    return (
        <div className="flex items-center border-b border-[#1c1f26] bg-[#0f1115]">
            <div className="flex items-center overflow-x-auto scrollbar-none flex-1">
                {openFiles.map((filePath) => {
                    const isActive = filePath === activeFilePath
                    const isDirty = unsavedFiles.has(filePath)
                    return (
                        <div
                            key={filePath}
                            onClick={() => onSelect(filePath)}
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
                            <span>{getFileName(filePath)}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onClose(filePath)
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
                    disabled={!activeFilePath || !unsavedFiles.has(activeFilePath)}
                    className={cn(
                        "flex items-center justify-center w-7 h-7 rounded transition-colors",
                        activeFilePath && unsavedFiles.has(activeFilePath)
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
    const [treeData, setTreeData] = React.useState<FileTreeNode | null>(null)
    const [activeFilePath, setActiveFilePath] = React.useState("")
    const [openFiles, setOpenFiles] = React.useState<string[]>([])
    const [unsavedFiles, setUnsavedFiles] = React.useState<Set<string>>(new Set())
    // Stores the live edited content per file path — seeded from tree on load, updated on edit.
    const [fileContents, setFileContents] = React.useState<Record<string, string>>({})
    const hasUnsaved = unsavedFiles.size > 0

    const playgroundTitle =
        (typeof playgroundData?.title === "string" && playgroundData.title.trim()) ||
        (typeof templateData?.name === "string" && templateData.name.trim()) ||
        "Untitled Playground"

    // Seed fileContents from the loaded tree so existing file content shows immediately.
    React.useEffect(() => {
        if (!templateData) {
            setTreeData(null)
            setActiveFilePath("")
            setOpenFiles([])
            setFileContents({})
            return
        }

        const normalizedTree = rebuildPaths(cloneTree(templateData), ".")
        setTreeData(normalizedTree)
        // Extract all file contents from the tree into the flat map.
        setFileContents(extractAllFileContents(normalizedTree))
        setActiveFilePath((current) => {
            const first = current || findFirstFilePath(normalizedTree)
            if (first) setOpenFiles([first])
            return first
        })
    }, [templateData])

    const handleSave = React.useCallback(() => {
        if (!activeFilePath) return
        // Write the edited content back into the tree node before persisting.
        setTreeData((prev) => {
            if (!prev) return prev
            const draft = cloneTree(prev)
            updateNodeByPath(draft, activeFilePath, (target) => {
                target.content = fileContents[activeFilePath] ?? target.content
            })
            const rebuilt = rebuildPaths(draft, ".")
            void saveTemplateData(rebuilt)
            return rebuilt
        })
        setUnsavedFiles((prev) => {
            const next = new Set(prev)
            next.delete(activeFilePath)
            return next
        })
    }, [activeFilePath, fileContents, saveTemplateData])

    const handleSaveAll = React.useCallback(() => {
        // Write all edited contents back into the tree before persisting.
        setTreeData((prev) => {
            if (!prev) return prev
            const draft = cloneTree(prev)
            for (const [filePath, content] of Object.entries(fileContents)) {
                updateNodeByPath(draft, filePath, (target) => {
                    target.content = content
                })
            }
            const rebuilt = rebuildPaths(draft, ".")
            void saveTemplateData(rebuilt)
            return rebuilt
        })
        setUnsavedFiles(new Set())
    }, [fileContents, saveTemplateData])

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

    // Updates the in-memory content for a file and marks it dirty.
    const handleFileChange = React.useCallback((filePath: string, newContent: string) => {
        setFileContents((prev) => ({ ...prev, [filePath]: newContent }))
        setUnsavedFiles((prev) => new Set(prev).add(filePath))
    }, [])

    const handleFileSelect = React.useCallback((filePath: string) => {
        setOpenFiles((prev) => prev.includes(filePath) ? prev : [...prev, filePath])
        setActiveFilePath(filePath)
    }, [])

    const handleCloseFile = React.useCallback((filePath: string) => {
        setOpenFiles((prev) => {
            const next = prev.filter((f) => f !== filePath)
            if (activeFilePath === filePath) {
                const idx = prev.indexOf(filePath)
                const fallback = next[idx] ?? next[idx - 1] ?? ""
                setActiveFilePath(fallback)
            }
            return next
        })
    }, [activeFilePath])

    const applyTreeChange = React.useCallback(
        (mutate: (draft: FileTreeNode) => boolean) => {
            setTreeData((previous) => {
                if (!previous) return previous
                const draft = cloneTree(previous)
                const hasChanged = mutate(draft)
                if (!hasChanged) return previous
                const normalizedTree = rebuildPaths(draft, ".")
                void saveTemplateData(normalizedTree)
                return normalizedTree
            })
        },
        [saveTemplateData]
    )

    const handleAddFile = React.useCallback((parentPath: string, filename: string, extension: string) => {
        const cleanFilename = sanitizeNodeName(filename)
        const cleanExtension = sanitizeNodeName(extension).replace(/^\./, "")
        if (!cleanFilename) return
        const newName = cleanExtension ? `${cleanFilename}.${cleanExtension}` : cleanFilename

        applyTreeChange((draft) => {
            let didCreate = false
            const changed = updateNodeByPath(draft, parentPath, (target) => {
                if (target.type !== "directory") return
                const children = target.children ?? []
                if (children.some((child) => child.name === newName)) return
                children.push({
                    name: newName,
                    path: toChildPath(parentPath, newName),
                    type: "file",
                    content: "",
                })
                target.children = children
                didCreate = true
            })
            if (didCreate) {
                const newPath = toChildPath(parentPath, newName)
                // Seed an empty content entry for the new file.
                setFileContents((prev) => ({ ...prev, [newPath]: "" }))
                setOpenFiles((prev) => prev.includes(newPath) ? prev : [...prev, newPath])
                setActiveFilePath(newPath)
            }
            return changed && didCreate
        })
    }, [applyTreeChange])

    const handleAddFolder = React.useCallback((parentPath: string, folderName: string) => {
        const cleanFolderName = sanitizeNodeName(folderName)
        if (!cleanFolderName) return
        applyTreeChange((draft) => {
            let didCreate = false
            const changed = updateNodeByPath(draft, parentPath, (target) => {
                if (target.type !== "directory") return
                const children = target.children ?? []
                if (children.some((child) => child.name === cleanFolderName)) return
                children.push({
                    name: cleanFolderName,
                    path: toChildPath(parentPath, cleanFolderName),
                    type: "directory",
                    children: [],
                })
                target.children = children
                didCreate = true
            })
            return changed && didCreate
        })
    }, [applyTreeChange])

    const handleDeleteFile = React.useCallback((filePath: string) => {
        applyTreeChange((draft) => {
            const removed = removeNodeByPath(draft, filePath)
            if (removed) {
                setFileContents((prev) => { const n = { ...prev }; delete n[filePath]; return n })
                setOpenFiles((prev) => prev.filter((f) => f !== filePath))
                if (activeFilePath === filePath) setActiveFilePath(findFirstFilePath(draft))
            }
            return removed
        })
    }, [activeFilePath, applyTreeChange])

    const handleDeleteFolder = React.useCallback((folderPath: string) => {
        applyTreeChange((draft) => {
            const removed = removeNodeByPath(draft, folderPath)
            if (removed) {
                setFileContents((prev) => {
                    const n = { ...prev }
                    for (const k of Object.keys(n)) {
                        if (k === folderPath || k.startsWith(`${folderPath}/`)) delete n[k]
                    }
                    return n
                })
                setOpenFiles((prev) => prev.filter((f) => f !== folderPath && !f.startsWith(`${folderPath}/`)))
                if (activeFilePath === folderPath || activeFilePath.startsWith(`${folderPath}/`)) {
                    setActiveFilePath(findFirstFilePath(draft))
                }
            }
            return removed
        })
    }, [activeFilePath, applyTreeChange])

    const handleRenameFile = React.useCallback((filePath: string, filename: string, extension: string) => {
        const cleanFilename = sanitizeNodeName(filename)
        const cleanExtension = sanitizeNodeName(extension).replace(/^\./, "")
        if (!cleanFilename) return
        const updatedFileName = cleanExtension ? `${cleanFilename}.${cleanExtension}` : cleanFilename

        applyTreeChange((draft) => {
            const updated = updateNodeByPath(draft, filePath, (target) => {
                target.name = updatedFileName
            })
            if (updated) {
                const parentPath = filePath.includes("/") ? filePath.slice(0, filePath.lastIndexOf("/")) : "."
                const newPath = toChildPath(parentPath || ".", updatedFileName)
                // Migrate content and unsaved state to the new path.
                setFileContents((prev) => {
                    const n = { ...prev, [newPath]: prev[filePath] ?? "" }
                    delete n[filePath]
                    return n
                })
                setUnsavedFiles((prev) => {
                    const n = new Set(prev)
                    if (n.has(filePath)) { n.delete(filePath); n.add(newPath) }
                    return n
                })
                setOpenFiles((prev) => prev.map((f) => f === filePath ? newPath : f))
                if (activeFilePath === filePath) setActiveFilePath(newPath)
            }
            return updated
        })
    }, [activeFilePath, applyTreeChange])

    const handleRenameFolder = React.useCallback((folderPath: string, newFolderName: string) => {
        const cleanFolderName = sanitizeNodeName(newFolderName)
        if (!cleanFolderName) return

        applyTreeChange((draft) => {
            const updated = updateNodeByPath(draft, folderPath, (target) => {
                target.name = cleanFolderName
            })
            if (updated) {
                const parentPath = folderPath.includes("/") ? folderPath.slice(0, folderPath.lastIndexOf("/")) : "."
                const renamedFolderPath = toChildPath(parentPath || ".", cleanFolderName)
                // Remap all content keys and open tabs under the renamed folder.
                setFileContents((prev) => {
                    const n: Record<string, string> = {}
                    for (const [k, v] of Object.entries(prev)) {
                        const newKey = (k === folderPath || k.startsWith(`${folderPath}/`))
                            ? renamedFolderPath + k.slice(folderPath.length)
                            : k
                        n[newKey] = v
                    }
                    return n
                })
                setOpenFiles((prev) =>
                    prev.map((f) =>
                        f === folderPath || f.startsWith(`${folderPath}/`)
                            ? renamedFolderPath + f.slice(folderPath.length)
                            : f
                    )
                )
                if (activeFilePath === folderPath || activeFilePath.startsWith(`${folderPath}/`)) {
                    setActiveFilePath(renamedFolderPath + activeFilePath.slice(folderPath.length))
                }
            }
            return updated
        })
    }, [activeFilePath, applyTreeChange])

    if (isLoading && !treeData) {
        return (
            <SidebarInset>
                <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
                    Loading playground...
                </div>
            </SidebarInset>
        )
    }

    if (error && !treeData) {
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
            {treeData && (
                <TemplateFileTree
                    data={treeData}
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
                <div className="justify-center flex items-center px-4 py-2 border-b border-[#1c1f26] bg-[#0f1115] shrink-0">
                    <div className="justify-center w-2xl flex items-center gap-2 px-3 py-1 rounded-md border border-[#2a2f3a] bg-[#141821]">
                        <span className="text-[11px] tracking-widest uppercase text-[#5c6370] font-semibold select-none">
                            Playground
                        </span>
                        <span className="text-[#aab1bf] text-[13px] font-mono font-medium">
                            {playgroundTitle}
                        </span>
                    </div>
                </div>

                <OpenFilesTabs
                    openFiles={openFiles}
                    activeFilePath={activeFilePath}
                    unsavedFiles={unsavedFiles}
                    onSelect={handleFileSelect}
                    onClose={handleCloseFile}
                    onSave={handleSave}
                    onSaveAll={handleSaveAll}
                />

                {/* Editor area */}
                <div className="flex-1 overflow-auto bg-[#0f1115]">
                    {activeFilePath ? (
                        // Replace this textarea with your real editor component.
                        // Pass value={fileContents[activeFilePath] ?? ""}
                        // and onChange={(e) => handleFileChange(activeFilePath, e.target.value)}
                        <textarea
                            key={activeFilePath}
                            value={fileContents[activeFilePath] ?? ""}
                            onChange={(e) => handleFileChange(activeFilePath, e.target.value)}
                            spellCheck={false}
                            className="w-full h-full resize-none bg-[#0f1115] text-[#aab1bf] text-[13px] font-mono p-4 outline-none border-none"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-[#5c6370]">
                            No file open
                        </div>
                    )}
                </div>
            </SidebarInset>
        </div>
    )
}

export default MainPlaygroundPage
