import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { db } from '@/lib/db'
import { verifyShareToken } from '@/lib/share-token'

function sessionKey(playgroundId: string) {
    return `collab:session:${playgroundId}`
}

function parseMaybeNestedJson(value: unknown): unknown {
    let current = value

    for (let i = 0; i < 5; i += 1) {
        if (typeof current !== 'string') return current
        const text = current.trim()
        const looksJson = text.startsWith('{') || text.startsWith('[') || text.startsWith('"{') || text.startsWith('"[')
        if (!looksJson) return current

        try {
            current = JSON.parse(text)
        } catch {
            return current
        }
    }

    return current
}

type TemplateNode = {
    name: string
    path: string
    type: 'directory' | 'file'
    children?: TemplateNode[]
    content?: string
}

function toTemplateTreeFromFiles(
    files: Array<{ path?: unknown; content?: unknown }>,
): TemplateNode {
    const root: TemplateNode = {
        name: 'shared-playground',
        path: '.',
        type: 'directory',
        children: [],
    }

    for (const entry of files) {
        if (typeof entry.path !== 'string' || !entry.path.trim()) continue
        const normalizedPath = entry.path.replace(/^\/+/, '').replace(/\\/g, '/').trim()
        if (!normalizedPath) continue

        const segments = normalizedPath.split('/').filter(Boolean)
        let cursor = root
        let currentPath = '.'

        for (let i = 0; i < segments.length; i += 1) {
            const segment = segments[i]
            const isFile = i === segments.length - 1
            currentPath = currentPath === '.' ? segment : `${currentPath}/${segment}`

            if (!cursor.children) cursor.children = []

            let child = cursor.children.find(
                (node) => node.name === segment && node.type === (isFile ? 'file' : 'directory'),
            )

            if (!child) {
                child = {
                    name: segment,
                    path: currentPath,
                    type: isFile ? 'file' : 'directory',
                    children: isFile ? undefined : [],
                    content: isFile
                        ? typeof entry.content === 'string'
                            ? entry.content
                            : JSON.stringify(entry.content ?? '', null, 2)
                        : undefined,
                }
                cursor.children.push(child)
            }

            if (!isFile) {
                cursor = child
            }
        }
    }

    return root
}

function normalizeSnapshotToTemplateContent(parsedContent: unknown): unknown {
    if (!parsedContent || typeof parsedContent !== 'object') {
        return parsedContent
    }

    const obj = parsedContent as Record<string, unknown>
    const files = obj.files

    if (Array.isArray(files)) {
        const hasPathEntries = files.some(
            (entry) => typeof entry === 'object' && entry !== null && typeof (entry as Record<string, unknown>).path === 'string',
        )
        if (hasPathEntries) {
            return toTemplateTreeFromFiles(files as Array<{ path?: unknown; content?: unknown }>)
        }
    }

    return parsedContent
}

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ token: string }> },
) {
    const { token } = await params

    if (!verifyShareToken(token)) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const link = await db.shareLink.findUnique({
        where: { token },
        select: {
            playgroundId: true,
            permission: true,
            isRevoked: true,
            expiresAt: true,
        },
    })

    if (!link || link.isRevoked) {
        return NextResponse.json({ error: 'Link not found or revoked' }, { status: 404 })
    }

    if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) {
        return NextResponse.json({ error: 'Link expired' }, { status: 410 })
    }

    if (link.permission !== 'VIEW_AND_EDIT') {
        return NextResponse.json({ error: 'This link does not have edit permission' }, { status: 403 })
    }

    const cached = await redis.get(sessionKey(link.playgroundId))
    if (!cached) {
        return NextResponse.json({
            ok: true,
            source: 'db',
            message: 'No active Redis session found, latest DB snapshot already in place',
        })
    }

    const session = JSON.parse(cached) as { content: string; revision: number }
    const parsedContent = parseMaybeNestedJson(session.content)
    const normalizedContent = normalizeSnapshotToTemplateContent(parsedContent)

    await db.templateFile.upsert({
        where: { playgroundId: link.playgroundId },
        update: { content: normalizedContent as never },
        create: {
            playgroundId: link.playgroundId,
            content: normalizedContent as never,
        },
    })

    return NextResponse.json({
        ok: true,
        source: 'redis',
        revision: session.revision,
    })
}
