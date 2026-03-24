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
        const { openFiles } = get()
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

        set({ openFiles: updatedOpenFiles, editorContent: content })
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
}))

export { useFileExplorerStore }
export default useFileExplorerStore