import type { FileTreeNode } from './path-to-json'

// Resolves a stable file id from path and falls back to tree lookup if needed.
// This prevents tab collisions when files share names in different folders.
const generateFileId = (file: FileTreeNode, rootFolder: FileTreeNode | null): string => {
  if (file.path) {
    return file.path
  }

  if (!rootFolder || rootFolder.type !== 'directory') {
    throw new Error(`File ${file.name} is missing a valid path`)
  }

  const findFilePath = (node: FileTreeNode): string | null => {
    if (node.type === 'file' && node.name === file.name) {
      return node.path || node.name
    }

    if (node.type !== 'directory') {
      return null
    }

    for (const child of node.children ?? []) {
      const result = findFilePath(child)
      if (result) {
        return result
      }
    }

    return null
  }

  const filePath = findFilePath(rootFolder)
  if (!filePath) {
    throw new Error(`File ${file.name} not found in template tree`)
  }

  return filePath
}

export { generateFileId }
