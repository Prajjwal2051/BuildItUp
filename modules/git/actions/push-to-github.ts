"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"

type GistFiles = Record<string, { content: string }>

function normalizeTemplateFiles(content: unknown): GistFiles {
    if (!content || typeof content !== "object" || Array.isArray(content)) {
        throw new Error("Invalid template file format")
    }

    const normalized: GistFiles = {}
    for (const [name, value] of Object.entries(content)) {
        if (!name || typeof name !== "string") {
            continue
        }

        if (typeof value === "string") {
            normalized[name] = { content: value }
            continue
        }

        // Accept file objects like { content: "..." } from richer editors.
        if (value && typeof value === "object" && "content" in value) {
            const fileContent = (value as { content?: unknown }).content
            if (typeof fileContent === "string") {
                normalized[name] = { content: fileContent }
            }
        }
    }

    if (Object.keys(normalized).length === 0) {
        throw new Error("No valid files found to push")
    }

    return normalized
}

export async function pushToGithub(playgroundId: string, repoName: string, messege: string) {
    const session = await auth()
    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    if (!playgroundId.trim()) {
        throw new Error("Playground ID is required")
    }

    // get the access token for the user of the github
    const githubAccount = await db.account.findFirst({
        where: {
            userId: session.user.id,
            provider: "github"
        },
        select: {
            access_token: true
        }
    })

    if (!githubAccount?.access_token) {
        throw new Error("connect your github account first.")
    }

    // now get the file content
    const templateFile = await db.templateFile.findUnique({
        where: {
            playgroundId
        },
        select: {
            content: true,
            playground: {
                select: {
                    userId: true
                }
            }
        }
    })

    if (!templateFile) {
        throw new Error("No files found in playground")
    }

    if (templateFile.playground.userId !== session.user.id) {
        throw new Error("You do not have permission to push this playground")
    }

    const files = normalizeTemplateFiles(templateFile.content)
    const description = messege?.trim() || `Snapshot from ${repoName || "BuildItUp"}`

    // Push to GitHub Gist (simplest approach — no repo creation needed)
    const response = await fetch("https://api.github.com/gists", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${githubAccount.access_token}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
            description,
            public: false,
            files,
        }),
    })

    const gist = await response.json()

    if (!response.ok) {
        const apiMessage =
            gist && typeof gist === "object" && "message" in gist
                ? String((gist as { message?: unknown }).message)
                : "GitHub API request failed"
        throw new Error(`Failed to create gist: ${apiMessage}`)
    }

    if (!gist?.html_url) {
        throw new Error("GitHub returned an invalid gist response")
    }

    return { url: gist.html_url as string, id: gist.id as string }
}
