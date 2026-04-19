"use server"

// this is the server actions for the git commits, which will allow users to save different versions of their playgrounds. It includes actions for creating a new commit, getting all commits for a playground, and getting a specific commit by ID. The actions interact with the Prisma client to perform database operations and return the appropriate responses.

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"

// ── COMMIT ─────────────────────────────────────────────────────────────────
// Saves the current TemplateFile.content as an immutable snapshot.
// Called when the user clicks "Commit" in the Git panel.

export async function createCommit(playgroundId: string, message: string) {
    const session = await auth()
    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    // now grab the current content of the playground and save it as a new commit
    const templateFile = await db.templateFile.findUnique({
        where: {
            playgroundId: playgroundId
        }
    })
    if (!templateFile) {
        throw new Error("No Files found in Playground to commit")
    }
    if (templateFile.content === null) {
        throw new Error("Cannot create commit with null snapshot")
    }

    // now making a commit object
    const commit = await db.gitCommit.create({
        data: {
            message: message,
            snapshot: templateFile.content as Prisma.InputJsonValue,
            playgroundId: playgroundId,
            authorId: session.user.id
        }
    })

    revalidatePath(`/playground/${playgroundId}`)
    return commit
}


// ── COMMIT LOG ─────────────────────────────────────────────────────────────
// Returns all commits for a playground, newest first.
// Used to render the git log / history list.

export async function getCommitLog(playgroundId:string){
    const session = await auth()
    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }
    return db.gitCommit.findMany({
        where: { playgroundId },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            message: true,
            createdAt: true,
            author: {
                select: {
                    name: true,
                    image: true
                }
            }
        }
    })
}

// ── GET COMMIT SNAPSHOT ────────────────────────────────────────────────────
// Returns the full file snapshot of a single commit.
// Used when user clicks a commit to inspect or restore it.


export async function getCommitSnapShot(commitId:string) {
    const session = await auth()
    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }
    const commit = await db.gitCommit.findUnique({
        where: { id: commitId },
        select: {
            snapshot: true,
            message: true,
            createdAt: true,
        }
    })

    if (!commit) {
        throw new Error("Commit not found")
    }
    return commit
}

// ── RESTORE COMMIT ─────────────────────────────────────────────────────────
// Overwrites the current TemplateFile.content with a past commit's snapshot.
// This is the "checkout" / "revert" action.

export async function retoreCommit(playgroundId:string, commitId:string) {
    const session= await auth()
    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    const commit = await db.gitCommit.findUnique({
        where: { id: commitId },
        select: { snapshot: true }
    })
    if (!commit) {
        throw new Error("Commit not found")
    }

    // verify the ownership before restoring
    const playground = await db.playground.findUnique({
        where: { id: playgroundId }
    })
    if (!playground) {
        throw new Error("Playground not found")
    }
    if (playground?.userId !== session.user.id) {
        throw new Error("Unauthorized to restore this commit")
    }

    // now update the current TemplateFile with the commit snapshot
    await db.templateFile.update({
        where: { playgroundId: playgroundId },
        data: { content: commit.snapshot as Prisma.InputJsonValue }
    })

    revalidatePath(`/playground/${playgroundId}`)
    return { message: "Playground restored to selected commit" }


}