import { promises as fs } from "node:fs"
import path from "node:path"

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

// Converts a file or folder path into a JSON tree so the playground can consume it easily.
// It keeps relative paths stable, which helps when rendering nested file explorers.
export async function pathToJson(
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

			// Sort folders first, then files, to make explorer rendering predictable.
			const sortedEntries = [...entries].sort((a, b) => {
				const aIsDir = fs.stat(path.join(currentPath, a)).then((s) => s.isDirectory())
				const bIsDir = fs.stat(path.join(currentPath, b)).then((s) => s.isDirectory())
				return 0
			})

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
export async function pathToJsonString(
	inputPath: string,
	options: PathToJsonOptions = {}
): Promise<string> {
	const tree = await pathToJson(inputPath, options)
	return JSON.stringify(tree, null, 2)
}
