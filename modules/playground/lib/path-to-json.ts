import { promises as fs } from "node:fs"
import path from "node:path"

// This file defines utility functions for converting file system paths into JSON representations and saving JSON data back to the file system. The main function, `pathToJson`, recursively traverses a directory structure and builds a JSON tree that represents the files and folders. It includes options for controlling the depth of traversal, whether to include file content, and which files or directories to ignore. The `saveTemplateToJson` function allows saving a JSON representation of a template to a specified output path, with options for encoding, pretty-printing, and automatic directory creation.
export type FileTreeNode = {
    name: string
    path: string
    type: "directory" | "file"
    children?: FileTreeNode[]
    content?: string
}

export type PathToJsonOptions = {
    includeFileContent?: boolean
    maxDepth?: number
    encoding?: BufferEncoding
    ignore?: string[]
}

export type SaveTemplateJsonOptions = {
    encoding?: BufferEncoding
    prettyPrint?: boolean
    createDirectoryIfMissing?: boolean
}

export type ReadTemplateJsonOptions = {
    encoding?: BufferEncoding
}

// Checks if parsed JSON looks like a template node so we fail early on invalid files.
// This keeps downstream playground logic safer by rejecting malformed structures.
function isFileTreeNode(value: unknown): value is FileTreeNode {
    if (!value || typeof value !== "object") {
        return false
    }

    const node = value as Partial<FileTreeNode>
    const hasValidType = node.type === "directory" || node.type === "file"
    return (
        typeof node.name === "string" &&
        typeof node.path === "string" &&
        hasValidType
    )
}

// Converts a file or folder path into a JSON tree so the playground can consume it easily.
// It keeps relative paths stable, which helps when rendering nested file explorers.
async function pathToJson(
    inputPath: string,
    options: PathToJsonOptions = {}
): Promise<FileTreeNode> {
    const {
        includeFileContent = false,
        maxDepth = Number.POSITIVE_INFINITY,
        encoding = "utf-8",
        ignore = ["node_modules", ".git", ".next", "dist", "build"],
    } = options

    const absoluteInputPath = path.resolve(inputPath)
    const stat = await fs.stat(absoluteInputPath)

    const walk = async (currentPath: string, depth: number): Promise<FileTreeNode | null> => {
        const name = path.basename(currentPath)
        if (ignore.includes(name)) {
            return null
        }

        const currentStat = await fs.stat(currentPath)
        const relativePath = path.relative(absoluteInputPath, currentPath) || "."

        if (currentStat.isDirectory()) {
            if (depth >= maxDepth) {
                return {
                    name,
                    path: relativePath,
                    type: "directory",
                    children: [],
                }
            }

            const entries = await fs.readdir(currentPath)

            const sortedEntries = [...entries].sort((a, b) => a.localeCompare(b))

            const children: FileTreeNode[] = []
            for (const entry of sortedEntries) {
                const childNode = await walk(path.join(currentPath, entry), depth + 1)
                if (childNode) {
                    children.push(childNode)
                }
            }

            children.sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === "directory" ? -1 : 1
                }
                return a.name.localeCompare(b.name)
            })

            return {
                name,
                path: relativePath,
                type: "directory",
                children,
            }
        }

        const fileNode: FileTreeNode = {
            name,
            path: relativePath,
            type: "file",
        }

        // File content is optional so callers can choose between speed and full snapshot detail.
        if (includeFileContent) {
            fileNode.content = await fs.readFile(currentPath, { encoding })
        }

        return fileNode
    }

    if (stat.isDirectory()) {
        const rootNode = await walk(absoluteInputPath, 0)
        if (!rootNode) {
            throw new Error(`Unable to build JSON tree for path: ${inputPath}`)
        }
        return rootNode
    }

    const fileNode = await walk(absoluteInputPath, 0)
    if (!fileNode) {
        throw new Error(`Input path is ignored by configuration: ${inputPath}`)
    }
    return fileNode
}

// Convenience helper when a serialized JSON payload is needed directly.
async function pathToJsonString(
    inputPath: string,
    options: PathToJsonOptions = {}
): Promise<string> {
    const tree = await pathToJson(inputPath, options)
    return JSON.stringify(tree, null, 2)
}

// Reads a saved template JSON file and returns it as a typed tree for playground usage.
// It validates the root shape so invalid or unexpected files fail with a clear error.
async function readTemplateFromJson(
    inputPath: string,
    options: ReadTemplateJsonOptions = {}
): Promise<FileTreeNode> {
    const { encoding = "utf-8" } = options
    const absoluteInputPath = path.resolve(inputPath)
    const fileContent = await fs.readFile(absoluteInputPath, { encoding })

    let parsed: unknown
    try {
        parsed = JSON.parse(fileContent)
    } catch {
        throw new Error(`Invalid JSON in template file: ${inputPath}`)
    }

    if (!isFileTreeNode(parsed)) {
        throw new Error(`Invalid template structure in file: ${inputPath}`)
    }

    return parsed
}

// Saves an updated template tree as a JSON file so the latest playground state can be persisted.
// It also supports creating the destination folder automatically to avoid manual setup errors.
async function saveTemplateToJson(
    template: FileTreeNode,
    outputPath: string,
    options: SaveTemplateJsonOptions = {}
): Promise<void> {
    const {
        encoding = "utf-8",
        prettyPrint = true,
        createDirectoryIfMissing = true,
    } = options

    const absoluteOutputPath = path.resolve(outputPath)
    if (createDirectoryIfMissing) {
        await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true })
    }

    const json = prettyPrint
        ? JSON.stringify(template, null, 2)
        : JSON.stringify(template)

    await fs.writeFile(absoluteOutputPath, json, { encoding })
}

function TemplateFile(name: string, path: string, content?: string): FileTreeNode {
    return {
        name,
        path,
        type: "file",
        content,
    }
}

function TemplateFolder(name: string, path: string, children: FileTreeNode[] = []): FileTreeNode {
    return {
        name,
        path,
        type: "directory",
        children,
    }
}

export {
    pathToJson,
    pathToJsonString,
    readTemplateFromJson,
    saveTemplateToJson,
    TemplateFile,
    TemplateFolder,
}
