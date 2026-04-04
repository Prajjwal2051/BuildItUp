"use server"

// This file is for server actions related to the dashboard, such as fetching user-specific data or handling form submissions. For client-side interactions, use components and hooks within the dashboard module.

// when our user comes to the dashboard page, we want to fetch their playground and display them. This action will be called from the dashboard page component to get the data needed for rendering.
import { db } from "@/lib/db"
import { currentUser } from './../../auth/actions/index';
import { revalidatePath } from "next/cache"
import { getTemplateAbsolutePath } from "@/lib/template"
import { pathToJsonString, type FileTreeNode } from "@/modules/playground/lib/path-to-json"

// This function fetches all playgrounds associated with a given user ID. It first retrieves the user to ensure they exist and then includes their related playgrounds in the query.

async function getAllPlaygroundForUser() {
    // We start by calling the currentUser function to check if there is an authenticated user. If there is no user, we return null, indicating that the action cannot proceed without authentication.
    const user = await currentUser()
    if (!user) {
        return null
    }
    // We only fetch fields needed by the dashboard list to avoid relation hydration failures
    // when legacy playground rows point to missing user documents in MongoDB.
    try {
        const playground = await db.playground.findMany({
            where: {
                userId: user?.id,
            },
            include: {
                starMark: {
                    where: {
                        userId: user.id
                    },
                    select: {
                        isMarked: true
                    }
                }
            },
        });

        return playground;
    } catch (error) {
        console.log(`Error fetching playgrounds for user ${user.id}:`, error);
    }
}

async function createPlayground(data: {
    title: string,
    template: "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "ANGULAR" | "HONO",
    description?: string
}) {
    // First, we check if the user is authenticated by calling the currentUser function. If there is no authenticated user, we throw an error indicating that the action is unauthorized. This ensures that only logged-in users can create a playground.
    const user = await currentUser()
    if (!user) {
        throw new Error("Unauthorized")
        return null
    }
    // now destructing the data and validating it before creating the playground. We want to ensure that the title and template are provided, as they are essential for creating a playground. If either of these is missing, we throw an error to inform the user of the required fields.
    const { title, template, description } = data
    if (!title || !template) {
        throw new Error("Title and template are required")
        return null
    }
    // We snapshot the selected starter template as JSON so the editor can boot with a full file tree.
    const starterTemplateJson = await pathToJsonString(getTemplateAbsolutePath(template), {
        includeFileContent: true,
        ignore: ["node_modules", ".git", ".next", "dist", "build", "package-lock.json", "pnpm-lock.yaml", "yarn.lock"],
    })

    // If the user is authenticated and the required data is valid, we proceed to create a new playground in the database. We use the create method of the db.playground model, passing in the necessary data such as the title, template, description, and the userId of the authenticated user. This action will return the newly created playground object.
    try {
        const playground = await db.playground.create({
            data: {
                title: title,
                template: template,
                description: description ?? "",
                code: starterTemplateJson,
                userId: user.id
            }
        })
        return playground
    } catch (error) {
        console.log(`Error creating playground for user ${user.id}:`, error)
    }
}

async function deletePlaygroundById(playgroundId: string) {
    // First, we check if the user is authenticated by calling the currentUser function. If there is no authenticated user, we throw an error indicating that the action is unauthorized. This ensures that only logged-in users can delete a playground.
    const user = await currentUser()
    if (!user) {
        throw new Error("Unauthorized")
        return null
    }
    // If the user is authenticated, we proceed to delete the playground from the database. We use the delete method of the db.playground model, specifying the playgroundId in the where clause to identify which playground to delete. This action will return the deleted playground object.
    try {
        const deletedPlayground = await db.playground.delete({
            where: {
                id: playgroundId
            }
        })
        revalidatePath("/dashboard") // Revalidate the dashboard page to reflect the changes after deletion
        return deletedPlayground
    } catch (error) {
        console.log(`Error deleting playground with id ${playgroundId}:, error)`)
    }
}

async function editPlaygroundById(playgroundId: string, data: {
    title?: string,
    description?: string
}) {
    // First, we check if the user is authenticated by calling the currentUser function. If there is no authenticated user, we throw an error indicating that the action is unauthorized. This ensures that only logged-in users can edit a playground.
    const user = await currentUser()
    if (!user) {
        throw new Error("Unauthorized")
        return null
    }
    // If the user is authenticated, we proceed to update the playground in the database. We use the update method of the db.playground model, specifying the playgroundId in the where clause to identify which playground to update. We also pass in the data object containing the fields to be updated (title and description). This action will return the updated playground object.
    try {
        const updatedPlayground = await db.playground.update({
            where: {
                id: playgroundId
            },
            data: {
                title: data.title,
                description: data.description
            }
        })
        revalidatePath("/dashboard") // Revalidate the dashboard page to reflect the changes after editing
        return updatedPlayground
    } catch (error) {
        console.log(`Error updating playground with id ${playgroundId}:, error)`)
    }
}

async function duplicatePlaygroundById(playground: string) {
    // First, we check if the user is authenticated by calling the currentUser function. If there is no authenticated user, we throw an error indicating that the action is unauthorized. This ensures that only logged-in users can duplicate a playground.
    const user = await currentUser()
    if (!user) {
        throw new Error("Unauthorized")
        return null
    }
    // first we will fetch the original playground from the database using the provided playground ID. We use the findUnique method of the db.playground model, specifying the playgroundId in the where clause to identify which playground to fetch. This will give us the original playground object that we want to duplicate.
    try {
        const originalPlayground = await db.playground.findUnique({
            where: {
                id: playground
            }
            // here we will implement the template feature later

        })
        if (!originalPlayground) {
            throw new Error("Playground not found")
            return null
        }
        // If the original playground is found, we proceed to create a new playground in the database using the data from the original playground. We use the create method of the db.playground model, passing in the necessary data such as the title (appending "Copy" to indicate it's a duplicate), template, description, code, and the userId of the authenticated user. This action will return the newly created playground object, which is a duplicate of the original.
        const duplicatePlayground = await db.playground.create({
            data: {
                title: originalPlayground.title + " (Copy)",
                template: originalPlayground.template,
                description: originalPlayground.description,
                code: originalPlayground.code,
                userId: user.id
            }
        })
        revalidatePath("/dashboard") // Revalidate the dashboard page to reflect the changes after duplication
        return duplicatePlayground
    } catch (error) {
        console.log(`Error duplicating playground with id ${playground}:, error)`)
    }
}

// Toggles the current user's starred state for one playground so both table and sidebar stay in sync.
async function togglePlaygroundStarMark(playgroundId: string) {
    const user = await currentUser()
    if (!user) {
        throw new Error("Unauthorized")
    }

    try {
        const playground = await db.playground.findUnique({
            where: {
                id: playgroundId,
            },
            select: {
                id: true,
                userId: true,
            },
        })

        if (!playground || playground.userId !== user.id) {
            throw new Error("Playground not found")
        }

        const existingMark = await db.starMark.findUnique({
            where: {
                userId_playgroundId: {
                    userId: user.id,
                    playgroundId,
                },
            },
            select: {
                id: true,
                isMarked: true,
            },
        })

        const updatedMark = existingMark
            ? await db.starMark.update({
                where: {
                    id: existingMark.id,
                },
                data: {
                    isMarked: !existingMark.isMarked,
                },
            })
            : await db.starMark.create({
                data: {
                    userId: user.id,
                    playgroundId,
                    isMarked: true,
                },
            })

        revalidatePath("/dashboard")
        return updatedMark
    } catch (error) {
        console.log(`Error toggling star mark for playground ${playgroundId}:`, error)
        throw error
    }
}

type GitHubRepoRef = {
    owner: string
    repo: string
    branch: string
}

// Parses common GitHub URL formats and returns owner/repo plus default branch fallback.
function parseGitHubRepoUrl(repoUrl: string): GitHubRepoRef | null {
    try {
        const normalized = repoUrl.trim().replace(/\.git$/, "")
        const url = new URL(normalized)
        if (url.hostname !== "github.com") return null

        const segments = url.pathname.split("/").filter(Boolean)
        if (segments.length < 2) return null

        const owner = segments[0]
        const repo = segments[1]
        let branch = "main"

        const treeIndex = segments.indexOf("tree")
        if (treeIndex >= 0 && segments[treeIndex + 1]) {
            branch = segments[treeIndex + 1]
        }

        return { owner, repo, branch }
    } catch {
        return null
    }
}

// Guesses the playground template from repository files so boot experience feels closer to the source project.
function inferTemplateFromPaths(paths: string[]): "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "ANGULAR" | "HONO" {
    const joined = paths.join("\n").toLowerCase()
    if (joined.includes("next.config") || joined.includes("app/layout.tsx")) return "NEXTJS"
    if (joined.includes("angular.json")) return "ANGULAR"
    if (joined.includes("src/main.ts") && joined.includes("vue")) return "VUE"
    if (joined.includes("hono")) return "HONO"
    if (joined.includes("express") || joined.includes("server.js")) return "EXPRESS"
    return "REACT"
}

// Inserts a file into a FileTreeNode tree using directory nodes for path segments.
function insertFileNode(root: FileTreeNode, fullPath: string, content: string) {
    const parts = fullPath.split("/").filter(Boolean)
    if (parts.length === 0) return

    let current = root
    for (let index = 0; index < parts.length; index += 1) {
        const part = parts[index]
        const isLast = index === parts.length - 1
        const nodePath = parts.slice(0, index + 1).join("/")

        if (!current.children) {
            current.children = []
        }

        if (isLast) {
            current.children.push({
                name: part,
                path: nodePath,
                type: "file",
                content,
            })
            return
        }

        let next = current.children.find((child) => child.type === "directory" && child.name === part)
        if (!next) {
            next = {
                name: part,
                path: nodePath,
                type: "directory",
                children: [],
            }
            current.children.push(next)
        }

        current = next
    }
}

// Sorts nodes with folders first so explorer rendering stays predictable.
function sortTree(node: FileTreeNode): FileTreeNode {
    if (node.type !== "directory") return node
    const children = (node.children ?? []).map(sortTree)
    children.sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1
        return a.name.localeCompare(b.name)
    })
    return { ...node, children }
}

async function createPlaygroundFromGithubRepo(repoUrl: string) {
    const user = await currentUser()
    if (!user) {
        throw new Error("Unauthorized")
    }

    const parsed = parseGitHubRepoUrl(repoUrl)
    if (!parsed) {
        throw new Error("Please provide a valid public GitHub repository URL")
    }

    const { owner, repo, branch } = parsed
    const apiBase = `https://api.github.com/repos/${owner}/${repo}`
    const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "User-Agent": "BuildItUp",
    }

    const treeResponse = await fetch(`${apiBase}/git/trees/${branch}?recursive=1`, {
        headers,
        cache: "no-store",
    })

    if (!treeResponse.ok) {
        throw new Error("Failed to fetch repository tree. Make sure the repo is public and URL is correct")
    }

    const treeJson = await treeResponse.json() as {
        tree?: Array<{ path: string; type: string; size?: number }>
    }

    const ignorePrefixes = ["node_modules/", ".git/", "dist/", "build/", ".next/"]
    const fileEntries = (treeJson.tree ?? [])
        .filter((entry) => entry.type === "blob")
        .filter((entry) => !ignorePrefixes.some((prefix) => entry.path.startsWith(prefix)))
        .filter((entry) => (entry.size ?? 0) <= 200_000)
        .slice(0, 250)

    if (fileEntries.length === 0) {
        throw new Error("No importable text files found in this repository")
    }

    const root: FileTreeNode = {
        name: repo,
        path: ".",
        type: "directory",
        children: [],
    }

    for (const entry of fileEntries) {
        const fileResponse = await fetch(`${apiBase}/contents/${encodeURIComponent(entry.path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(branch)}`, {
            headers,
            cache: "no-store",
        })
        if (!fileResponse.ok) {
            continue
        }

        const fileJson = await fileResponse.json() as { content?: string; encoding?: string }
        if (!fileJson.content || fileJson.encoding !== "base64") {
            continue
        }

        const decoded = Buffer.from(fileJson.content.replace(/\n/g, ""), "base64").toString("utf8")
        if (decoded.includes("\u0000")) {
            continue
        }

        insertFileNode(root, entry.path, decoded)
    }

    const normalizedTree = sortTree(root)
    const importedTemplate = inferTemplateFromPaths(fileEntries.map((entry) => entry.path))

    const playground = await db.playground.create({
        data: {
            title: repo,
            template: importedTemplate,
            description: `Imported from https://github.com/${owner}/${repo}`,
            code: JSON.stringify(normalizedTree, null, 2),
            userId: user.id,
        },
    })

    revalidatePath("/dashboard")
    return playground
}

export {
    getAllPlaygroundForUser,
    createPlayground,
    deletePlaygroundById,
    editPlaygroundById,
    duplicatePlaygroundById,
    togglePlaygroundStarMark,
    createPlaygroundFromGithubRepo,
}