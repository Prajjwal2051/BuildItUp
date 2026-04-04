// This hook keeps explorer state centralized (tree, tabs, active file, and dirty flags).
// It avoids prop-drilling and keeps file tab behavior consistent across the playground.

import { create } from "zustand"
import type { FileTreeNode } from "../lib/path-to-json"
import { generateFileId } from "../lib"

export interface OpenFile extends FileTreeNode {
    id: string
    hasUnsavedChanges: boolean
    content: string
    originalContent: string
}

// Keeps user-provided names safe for path operations in the file tree.
function sanitizeNodeName(name: string): string {
    return name.trim().replace(/[\\/]+/g, "")
}

// Builds a child path using the same dotted-root format used across the playground.
function toChildPath(parentPath: string, childName: string): string {
    return parentPath === "." ? childName : `${parentPath}/${childName}`
}

// Clones the full tree so mutations remain immutable for Zustand updates.
function cloneTree(node: FileTreeNode): FileTreeNode {
    return {
        ...node,
        children: node.children?.map(cloneTree),
    }
}

// Rebuilds paths after add/rename/delete so node paths stay consistent.
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

// Finds and updates one node in the tree by path.
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

// Removes one node by path and returns true when the tree was changed.
function removeNodeByPath(node: FileTreeNode, targetPath: string): boolean {
    if (node.type !== "directory" || !node.children || targetPath === ".") return false
    const originalLength = node.children.length
    node.children = node.children.filter((child) => child.path !== targetPath)
    if (node.children.length !== originalLength) return true
    return node.children.some((child) => removeNodeByPath(child, targetPath))
}

// Looks up a node by path so callers can safely open/select it.
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

interface FileExplorerState {
    playgroundId: string
    fileTree: FileTreeNode | null
    openFiles: OpenFile[]
    activeFileId: string | null
    editorContent: string
    setPlaygroundId: (id: string) => void
    setTemplateFileTree: (fileTree: FileTreeNode | null) => void
    setEditorContent: (content: string) => void
    setOpenFiles: (openFiles: OpenFile[]) => void
    setActiveFileId: (fileId: string | null) => void
    markFileAsUnsaved: (fileId: string, content: string) => void
    saveFileChanges: (fileId: string) => void
    openFile: (file: FileTreeNode) => void
    closeFile: (fileId: string) => void
    closeAllFiles: () => void
    saveFile: (fileId: string) => void
    addFile: (parentPath: string, filename: string, extension: string) => void
    addFolder: (parentPath: string, folderName: string) => void
    deleteFile: (filePath: string) => void
    deleteFolder: (folderPath: string) => void
    renameFile: (filePath: string, filename: string, extension: string) => void
    renameFolder: (folderPath: string, newFolderName: string) => void

    // file explorer methoods:

}

const useFileExplorerStore = create<FileExplorerState>((set, get) => ({
    playgroundId: "",
    fileTree: null,
    openFiles: [],
    activeFileId: null,
    editorContent: "",

    setPlaygroundId: (id) => set({ playgroundId: id }),
    setTemplateFileTree: (fileTree) => set({ fileTree }),
    setEditorContent: (content) => set({ editorContent: content }),
    setOpenFiles: (openFiles) => set({ openFiles }),
    setActiveFileId: (fileId) => set({ activeFileId: fileId }),

    // Opens a file tab once and reuses it when already open.
    openFile: (file) => {
        if (file.type !== "file") {
            return
        }

        const { fileTree, openFiles } = get()
        const fileId = generateFileId(file, fileTree)
        const existingFile = openFiles.find((openFile) => openFile.id === fileId)

        if (existingFile) {
            set({ activeFileId: existingFile.id, editorContent: existingFile.content })
            return
        }

        const newOpenFile: OpenFile = {
            ...file,
            id: fileId,
            hasUnsavedChanges: false,
            content: file.content ?? "",
            originalContent: file.content ?? "",
        }

        set({
            openFiles: [...openFiles, newOpenFile],
            activeFileId: newOpenFile.id,
            editorContent: newOpenFile.content,
        })
    },

    // Closes one tab and falls back to the next available tab.
    closeFile: (fileId) => {
        const { openFiles, activeFileId } = get()
        const updatedOpenFiles = openFiles.filter((file) => file.id !== fileId)

        if (activeFileId === fileId) {
            const fallback = updatedOpenFiles[0]
            set({
                openFiles: updatedOpenFiles,
                activeFileId: fallback?.id ?? null,
                editorContent: fallback?.content ?? "",
            })
            return
        }

        set({ openFiles: updatedOpenFiles })
    },

    closeAllFiles: () => {
        set({ openFiles: [], activeFileId: null, editorContent: "" })
    },

    // Marks the active tab dirty and mirrors latest text into store state.
    markFileAsUnsaved: (fileId, content) => {
        const { openFiles, activeFileId } = get()
        const updatedOpenFiles = openFiles.map((file) => {
            if (file.id !== fileId) {
                return file
            }

            return {
                ...file,
                hasUnsavedChanges: true,
                content,
            }
        })

        set({
            openFiles: updatedOpenFiles,
            editorContent: activeFileId === fileId ? content : get().editorContent,
        })
    },

    // Persists in-memory tab state by resetting dirty tracking baseline.
    saveFileChanges: (fileId) => {
        const { openFiles } = get()
        const updatedOpenFiles = openFiles.map((file) => {
            if (file.id !== fileId) {
                return file
            }

            return {
                ...file,
                hasUnsavedChanges: false,
                originalContent: file.content,
            }
        })

        set({ openFiles: updatedOpenFiles })
    },

    saveFile: (fileId) => {
        get().saveFileChanges(fileId)
    },

    // Creates a new file under a directory, opens it, and focuses the editor on it.
    addFile: (parentPath, filename, extension) => {
        const cleanFilename = sanitizeNodeName(filename)
        const cleanExtension = sanitizeNodeName(extension).replace(/^\./, "")
        if (!cleanFilename) return
        const newName = cleanExtension ? `${cleanFilename}.${cleanExtension}` : cleanFilename

        set((state) => {
            if (!state.fileTree) return state

            const draft = cloneTree(state.fileTree)
            let created = false
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
                created = true
            })

            if (!changed || !created) return state

            const nextTree = rebuildPaths(draft, ".")
            const newPath = toChildPath(parentPath, newName)
            const newFileNode = findNodeByPath(nextTree, newPath)
            if (!newFileNode || newFileNode.type !== "file") return { fileTree: nextTree }

            const newFile: OpenFile = {
                ...newFileNode,
                id: newFileNode.path,
                hasUnsavedChanges: false,
                content: newFileNode.content ?? "",
                originalContent: newFileNode.content ?? "",
            }

            const existing = state.openFiles.find((file) => file.id === newFile.id)
            const nextOpenFiles = existing ? state.openFiles : [...state.openFiles, newFile]

            return {
                fileTree: nextTree,
                openFiles: nextOpenFiles,
                activeFileId: newFile.id,
                editorContent: newFile.content,
            }
        })
    },

    // Creates a new folder under a directory path when no sibling has the same name.
    addFolder: (parentPath, folderName) => {
        const cleanFolderName = sanitizeNodeName(folderName)
        if (!cleanFolderName) return

        set((state) => {
            if (!state.fileTree) return state

            const draft = cloneTree(state.fileTree)
            let created = false
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
                created = true
            })

            if (!changed || !created) return state
            return { fileTree: rebuildPaths(draft, ".") }
        })
    },

    // Deletes one file and updates open tabs/editor selection if needed.
    deleteFile: (filePath) => {
        set((state) => {
            if (!state.fileTree) return state

            const draft = cloneTree(state.fileTree)
            const removed = removeNodeByPath(draft, filePath)
            if (!removed) return state

            const nextTree = rebuildPaths(draft, ".")
            const nextOpenFiles = state.openFiles.filter((file) => file.id !== filePath)
            const activeFileWasDeleted = state.activeFileId === filePath
            const fallbackActive = activeFileWasDeleted ? (nextOpenFiles[0]?.id ?? null) : state.activeFileId
            const fallbackEditorContent = fallbackActive
                ? (nextOpenFiles.find((file) => file.id === fallbackActive)?.content ?? "")
                : ""

            return {
                fileTree: nextTree,
                openFiles: nextOpenFiles,
                activeFileId: fallbackActive,
                editorContent: activeFileWasDeleted ? fallbackEditorContent : state.editorContent,
            }
        })
    },

    // Deletes a folder and closes every tab that belongs to that folder subtree.
    deleteFolder: (folderPath) => {
        set((state) => {
            if (!state.fileTree) return state

            const draft = cloneTree(state.fileTree)
            const removed = removeNodeByPath(draft, folderPath)
            if (!removed) return state

            const nextTree = rebuildPaths(draft, ".")
            const nextOpenFiles = state.openFiles.filter(
                (file) => file.id !== folderPath && !file.id.startsWith(`${folderPath}/`)
            )
            const activeWasDeleted = Boolean(
                state.activeFileId && (state.activeFileId === folderPath || state.activeFileId.startsWith(`${folderPath}/`))
            )
            const fallbackActive = activeWasDeleted ? (nextOpenFiles[0]?.id ?? null) : state.activeFileId
            const fallbackEditorContent = fallbackActive
                ? (nextOpenFiles.find((file) => file.id === fallbackActive)?.content ?? "")
                : ""

            return {
                fileTree: nextTree,
                openFiles: nextOpenFiles,
                activeFileId: fallbackActive,
                editorContent: activeWasDeleted ? fallbackEditorContent : state.editorContent,
            }
        })
    },

    // Renames a file and remaps open tab ids so the active editor stays stable.
    renameFile: (filePath, filename, extension) => {
        const cleanFilename = sanitizeNodeName(filename)
        const cleanExtension = sanitizeNodeName(extension).replace(/^\./, "")
        if (!cleanFilename) return
        const updatedFileName = cleanExtension ? `${cleanFilename}.${cleanExtension}` : cleanFilename

        set((state) => {
            if (!state.fileTree) return state

            const parentPath = filePath.includes("/") ? filePath.slice(0, filePath.lastIndexOf("/")) : "."
            const renamedPath = toChildPath(parentPath || ".", updatedFileName)

            const draft = cloneTree(state.fileTree)
            const updated = updateNodeByPath(draft, filePath, (target) => {
                target.name = updatedFileName
            })
            if (!updated) return state

            const nextTree = rebuildPaths(draft, ".")
            const renamedNode = findNodeByPath(nextTree, renamedPath)
            if (!renamedNode || renamedNode.type !== "file") return { fileTree: nextTree }

            const nextOpenFiles = state.openFiles.map((file) => {
                if (file.id !== filePath) return file
                return {
                    ...file,
                    ...renamedNode,
                    id: renamedNode.path,
                }
            })

            const nextActiveFileId = state.activeFileId === filePath ? renamedNode.path : state.activeFileId

            return {
                fileTree: nextTree,
                openFiles: nextOpenFiles,
                activeFileId: nextActiveFileId,
            }
        })
    },

    // Renames a folder and remaps all open file ids under that folder subtree.
    renameFolder: (folderPath, newFolderName) => {
        const cleanFolderName = sanitizeNodeName(newFolderName)
        if (!cleanFolderName) return

        set((state) => {
            if (!state.fileTree) return state

            const parentPath = folderPath.includes("/") ? folderPath.slice(0, folderPath.lastIndexOf("/")) : "."
            const renamedFolderPath = toChildPath(parentPath || ".", cleanFolderName)

            const draft = cloneTree(state.fileTree)
            const updated = updateNodeByPath(draft, folderPath, (target) => {
                target.name = cleanFolderName
            })
            if (!updated) return state

            const nextTree = rebuildPaths(draft, ".")
            const remapPath = (currentPath: string): string => {
                if (currentPath === folderPath || currentPath.startsWith(`${folderPath}/`)) {
                    return renamedFolderPath + currentPath.slice(folderPath.length)
                }
                return currentPath
            }

            const nextOpenFiles = state.openFiles.map((file) => {
                const nextId = remapPath(file.id)
                if (nextId === file.id) return file
                const node = findNodeByPath(nextTree, nextId)
                if (!node || node.type !== "file") {
                    return {
                        ...file,
                        id: nextId,
                        path: nextId,
                    }
                }
                return {
                    ...file,
                    ...node,
                    id: node.path,
                }
            })

            const nextActiveFileId = state.activeFileId ? remapPath(state.activeFileId) : null

            return {
                fileTree: nextTree,
                openFiles: nextOpenFiles,
                activeFileId: nextActiveFileId,
            }
        })
    },
}))

export { useFileExplorerStore }
export default useFileExplorerStore