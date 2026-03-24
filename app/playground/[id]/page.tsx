"use client"

import React from "react"
import { useParams } from "next/navigation"
import { SidebarInset } from "@/components/ui/sidebar"
import TemplateFileTree from "@/modules/playground/components/playground-explorer"
import usePlayground from "@/modules/playground/hooks/usePlayground"
import type { FileTreeNode } from "@/modules/playground/lib/path-to-json"


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
    const nextNode: FileTreeNode = {
        ...node,
        path,
    }

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
    if (node.type === "file") {
        return node.path
    }

    for (const child of node.children ?? []) {
        const first = findFirstFilePath(child)
        if (first) {
            return first
        }
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

    if (node.type !== "directory" || !node.children) {
        return false
    }

    return node.children.some((child) => updateNodeByPath(child, targetPath, update))
}

// Deletes one node by path and returns true when a child was removed.
function removeNodeByPath(node: FileTreeNode, targetPath: string): boolean {
    if (node.type !== "directory" || !node.children || targetPath === ".") {
        return false
    }

    const originalLength = node.children.length
    node.children = node.children.filter((child) => child.path !== targetPath)
    if (node.children.length !== originalLength) {
        return true
    }

    return node.children.some((child) => removeNodeByPath(child, targetPath))
}

// Renders a single playground workspace and keeps file-tree edits in sync with persistence.
// This page owns immutable tree mutations so nested CRUD actions remain predictable.
function MainPlaygroundPage() {

    const params = useParams<{ id?: string | string[] }>()
    // Route params can be string or string[] depending on segment shape, so normalize before use.
    const id = Array.isArray(params.id) ? (params.id[0] ?? "") : (params.id ?? "")
    const { templateData, isLoading, error, saveTemplateData } = usePlayground(id)
    const [treeData, setTreeData] = React.useState<FileTreeNode | null>(null)
    const [activeFilePath, setActiveFilePath] = React.useState("")

    // Keep local editable tree state in sync with server-loaded template data.
    React.useEffect(() => {
        if (!templateData) {
            setTreeData(null)
            setActiveFilePath("")
            return
        }

        const normalizedTree = rebuildPaths(cloneTree(templateData), ".")
        setTreeData(normalizedTree)
        setActiveFilePath((current) => current || findFirstFilePath(normalizedTree))
    }, [templateData])

    // Applies one tree mutation, then persists the updated snapshot.
    const applyTreeChange = React.useCallback(
        (mutate: (draft: FileTreeNode) => boolean) => {
            setTreeData((previous) => {
                if (!previous) {
                    return previous
                }

                const draft = cloneTree(previous)
                const hasChanged = mutate(draft)
                if (!hasChanged) {
                    return previous
                }

                const normalizedTree = rebuildPaths(draft, ".")
                void saveTemplateData(normalizedTree)
                return normalizedTree
            })
        },
        [saveTemplateData]
    )

    // Creates a new file under the selected parent folder.
    const handleAddFile = React.useCallback((parentPath: string, filename: string, extension: string) => {
        const cleanFilename = sanitizeNodeName(filename)
        const cleanExtension = sanitizeNodeName(extension).replace(/^\./, "")
        if (!cleanFilename) {
            return
        }

        const newName = cleanExtension ? `${cleanFilename}.${cleanExtension}` : cleanFilename

        applyTreeChange((draft) => {
            let didCreate = false
            const changed = updateNodeByPath(draft, parentPath, (target) => {
                if (target.type !== "directory") {
                    return
                }

                const children = target.children ?? []
                const alreadyExists = children.some((child) => child.name === newName)
                if (alreadyExists) {
                    return
                }

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
                setActiveFilePath(toChildPath(parentPath, newName))
            }

            return changed && didCreate
        })
    }, [applyTreeChange])

    // Creates a new folder under the selected parent folder.
    const handleAddFolder = React.useCallback((parentPath: string, folderName: string) => {
        const cleanFolderName = sanitizeNodeName(folderName)
        if (!cleanFolderName) {
            return
        }

        applyTreeChange((draft) => {
            let didCreate = false
            const changed = updateNodeByPath(draft, parentPath, (target) => {
                if (target.type !== "directory") {
                    return
                }

                const children = target.children ?? []
                const alreadyExists = children.some((child) => child.name === cleanFolderName)
                if (alreadyExists) {
                    return
                }

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

    // Removes one file and clears selection when it was the active one.
    const handleDeleteFile = React.useCallback((filePath: string) => {
        applyTreeChange((draft) => {
            const removed = removeNodeByPath(draft, filePath)
            if (removed && activeFilePath === filePath) {
                setActiveFilePath(findFirstFilePath(draft))
            }
            return removed
        })
    }, [activeFilePath, applyTreeChange])

    // Removes one folder and updates selection if the current file lived inside it.
    const handleDeleteFolder = React.useCallback((folderPath: string) => {
        applyTreeChange((draft) => {
            const removed = removeNodeByPath(draft, folderPath)
            if (removed && (activeFilePath === folderPath || activeFilePath.startsWith(`${folderPath}/`))) {
                setActiveFilePath(findFirstFilePath(draft))
            }
            return removed
        })
    }, [activeFilePath, applyTreeChange])

    // Renames a file while preserving extension handling from the dialog fields.
    const handleRenameFile = React.useCallback((filePath: string, filename: string, extension: string) => {
        const cleanFilename = sanitizeNodeName(filename)
        const cleanExtension = sanitizeNodeName(extension).replace(/^\./, "")
        if (!cleanFilename) {
            return
        }

        const updatedFileName = cleanExtension ? `${cleanFilename}.${cleanExtension}` : cleanFilename

        applyTreeChange((draft) => {
            const updated = updateNodeByPath(draft, filePath, (target) => {
                target.name = updatedFileName
            })

            if (updated && activeFilePath === filePath) {
                const parentPath = filePath.includes("/") ? filePath.slice(0, filePath.lastIndexOf("/")) : "."
                setActiveFilePath(toChildPath(parentPath || ".", updatedFileName))
            }

            return updated
        })
    }, [activeFilePath, applyTreeChange])

    // Renames a folder and remaps active selection into the new folder path.
    const handleRenameFolder = React.useCallback((folderPath: string, newFolderName: string) => {
        const cleanFolderName = sanitizeNodeName(newFolderName)
        if (!cleanFolderName) {
            return
        }

        applyTreeChange((draft) => {
            const updated = updateNodeByPath(draft, folderPath, (target) => {
                target.name = cleanFolderName
            })

            if (updated && (activeFilePath === folderPath || activeFilePath.startsWith(`${folderPath}/`))) {
                const parentPath = folderPath.includes("/") ? folderPath.slice(0, folderPath.lastIndexOf("/")) : "."
                const renamedFolderPath = toChildPath(parentPath || ".", cleanFolderName)
                const suffix = activeFilePath.slice(folderPath.length)
                setActiveFilePath(`${renamedFolderPath}${suffix}`)
            }

            return updated
        })
    }, [activeFilePath, applyTreeChange])

    if (isLoading && !treeData) {
        return (
            <SidebarInset>
                <div className='flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground'>
                    Loading playground...
                </div>
            </SidebarInset>
        )
    }

    if (error && !treeData) {
        return (
            <SidebarInset>
                <div className='flex min-h-[40vh] items-center justify-center text-sm text-destructive'>
                    {error}
                </div>
            </SidebarInset>
        )
    }

    return (
        <div>
            {treeData && (
                <TemplateFileTree
                    data={treeData}
                    onFileSelect={(filePath: string) => setActiveFilePath(filePath)}
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
        </div>
    )
}

export default MainPlaygroundPage