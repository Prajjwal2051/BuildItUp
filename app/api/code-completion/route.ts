// This API route handles code completion requests from the client.
// It receives the current file content and cursor position,
// and returns a code suggestion based on that context.
// Supports Ollama (local/remote), OpenAI, Gemini, and Anthropic.

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { resolveUserAiConfig } from '@/modules/playground/actions/ai-settings'
import { callAiProvider, type AiMessage } from '@/lib/ai-providers'
import { sanitizeCodeSuggestion } from '@/lib/ai-sanitize'

interface CodeCompletionRequestBody {
    fileContent: string
    cursorLine: number
    cursorColumn: number
    suggestionType: 'code' | 'comment'
    fileName?: string
    selectionStartLine?: number
    selectionStartColumn?: number
    selectionEndLine?: number
    selectionEndColumn?: number
    selectedText?: string
}

interface CodeContext {
    language: string
    framework: string
    libraries: string[]
    fileName?: string
    currentLineContent: string
    beforeCursorContent: string
    afterCursorContent: string
    selectedText?: string
    selectionRange?: {
        startLine: number
        startColumn: number
        endLine: number
        endColumn: number
    }
    cursorPosition: {
        line: number
        column: number
    }
    isInFunction: boolean
    isInClass: boolean
    isInComment: boolean
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
    try {
        // ── Auth ──────────────────────────────────────────────────────────────
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body: CodeCompletionRequestBody = await req.json()
        const {
            fileContent,
            cursorLine,
            cursorColumn,
            suggestionType,
            fileName,
            selectionStartLine,
            selectionStartColumn,
            selectionEndLine,
            selectionEndColumn,
            selectedText,
        } = body

        if (
            typeof fileContent !== 'string' ||
            typeof cursorLine !== 'number' ||
            typeof cursorColumn !== 'number' ||
            (suggestionType !== 'code' && suggestionType !== 'comment')
        ) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
        }

        if (
            cursorLine < 0 || !Number.isInteger(cursorLine) ||
            cursorColumn < 0 || !Number.isInteger(cursorColumn)
        ) {
            return NextResponse.json(
                { error: 'cursorLine and cursorColumn must be non-negative integers' },
                { status: 400 },
            )
        }

        // ── Resolve user AI config ────────────────────────────────────────────
        const config = await resolveUserAiConfig(session.user.id)

        if (!config.provider) {
            return NextResponse.json(
                {
                    error: 'AI provider not configured. Please set up your AI provider in Settings.',
                    setupRequired: true,
                },
                { status: 503 },
            )
        }

        // ── Build context & prompt ────────────────────────────────────────────
        const context = extractCodeContext(fileContent, cursorLine, cursorColumn, fileName, {
            selectionStartLine,
            selectionStartColumn,
            selectionEndLine,
            selectionEndColumn,
            selectedText,
        })
        const prompt = generatePrompt(context, suggestionType)

        // ── Call provider ─────────────────────────────────────────────────────
        const messages: AiMessage[] = [
            {
                role: 'system',
                content:
                    'You are a code completion engine. Return ONLY the raw code to be inserted at the cursor. No markdown fences, no explanations.',
            },
            { role: 'user', content: prompt },
        ]

        const result = await callAiProvider({
            provider: config.provider,
            messages,
            apiKey: config.apiKey ?? undefined,
            ollamaBaseUrl: config.ollamaBaseUrl ?? undefined,
            temperature: 0.2,
            maxTokens: 256,
        })

        const suggestion = sanitizeCodeSuggestion(result.content)

        return NextResponse.json({
            suggestion,
            context,
            metadata: {
                language: context.language,
                framework: context.framework,
                libraries: context.libraries,
                provider: result.provider,
                model: result.model,
                generatedAt: new Date().toISOString(),
            },
        })
    } catch (error: unknown) {
        console.error('Error in code completion API:', error)
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

// ---------------------------------------------------------------------------
// extractCodeContext
// ---------------------------------------------------------------------------

function extractCodeContext(
    fileContent: string,
    cursorLine: number,
    cursorColumn: number,
    fileName?: string,
    selection?: {
        selectionStartLine?: number
        selectionStartColumn?: number
        selectionEndLine?: number
        selectionEndColumn?: number
        selectedText?: string
    },
): CodeContext {
    const lines = fileContent.split('\n')
    const currentLineContent = lines[cursorLine] || ''

    const contextRadius = 10
    const startLine = Math.max(0, cursorLine - contextRadius)
    const endLine = Math.min(lines.length - 1, cursorLine + contextRadius)

    const beforeLines = lines.slice(startLine, cursorLine)
    const beforeCursorContent =
        (beforeLines.length > 0 ? beforeLines.join('\n') + '\n' : '') +
        currentLineContent.slice(0, cursorColumn)

    const afterCursorContent =
        currentLineContent.slice(cursorColumn) +
        '\n' +
        lines.slice(cursorLine + 1, endLine + 1).join('\n')

    const language = detectLanguage(fileName, fileContent)
    const framework = detectFramework(fileName, fileContent)
    const libraries = detectLibraries(fileContent)

    const isInFunction = detectIfInFunction(beforeCursorContent)
    const isInClass = detectIfInClass(beforeCursorContent)
    const isInComment = detectIfInComment(beforeCursorContent)

    const hasValidSelection =
        typeof selection?.selectionStartLine === 'number' &&
        typeof selection?.selectionStartColumn === 'number' &&
        typeof selection?.selectionEndLine === 'number' &&
        typeof selection?.selectionEndColumn === 'number'

    return {
        language,
        framework,
        libraries,
        fileName,
        currentLineContent,
        beforeCursorContent,
        afterCursorContent,
        selectedText: typeof selection?.selectedText === 'string' ? selection.selectedText : '',
        selectionRange: hasValidSelection
            ? {
                startLine: selection.selectionStartLine as number,
                startColumn: selection.selectionStartColumn as number,
                endLine: selection.selectionEndLine as number,
                endColumn: selection.selectionEndColumn as number,
            }
            : undefined,
        cursorPosition: { line: cursorLine, column: cursorColumn },
        isInFunction,
        isInClass,
        isInComment,
    }
}

function detectLanguage(fileName?: string, fileContent?: string): string {
    if (fileName) {
        const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/)
        if (extMatch) {
            const ext = extMatch[1].toLowerCase()
            const extMap: Record<string, string> = {
                ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
                py: 'python', rb: 'ruby', java: 'java', cs: 'csharp', cpp: 'cpp', c: 'c',
                go: 'go', rs: 'rust', php: 'php', swift: 'swift', kt: 'kotlin',
                html: 'html', css: 'css', scss: 'scss', json: 'json', md: 'markdown',
                yaml: 'yaml', yml: 'yaml', sh: 'bash', sql: 'sql',
            }
            if (extMap[ext]) return extMap[ext]
        }
    }
    if (fileContent) {
        if (/^\s*def\s+\w+\s*\(/m.test(fileContent) || /^import\s+\w+$/m.test(fileContent)) return 'python'
        if (/:\s*(string|number|boolean|void|any|never|unknown)\b/.test(fileContent) || /\binterface\s+\w+/.test(fileContent) || /\btype\s+\w+\s*=/.test(fileContent)) return 'typescript'
        if (/\b(public|private|protected)\s+(class|static|void)\b/.test(fileContent)) return 'java'
        if (/^package\s+\w+/m.test(fileContent)) return 'go'
        if (/\bfn\s+\w+\s*\(/.test(fileContent)) return 'rust'
        if (/\b(const|let|var|function|=>)\b/.test(fileContent)) return 'javascript'
    }
    return 'unknown'
}

function detectFramework(fileName?: string, fileContent?: string): string {
    const content = fileContent ?? ''
    if (/["']next\//.test(content) || /\b(NextRequest|NextResponse|getServerSideProps|getStaticProps)\b/.test(content) || (fileName && /\/(app|pages)\/.*\.(tsx?|jsx?)$/.test(fileName))) return 'nextjs'
    if (/["']react["']/.test(content) || /from\s+["']react["']/.test(content) || /<[A-Z][A-Za-z]+[\s/>]/.test(content)) return 'react'
    if (/<template>/.test(content) || /from\s+["']vue["']/.test(content)) return 'vue'
    if (/@(Component|NgModule|Injectable|Directive)\s*\(/.test(content) || /from\s+["']@angular\//.test(content)) return 'angular'
    if (fileName && /\.svelte$/.test(fileName)) return 'svelte'
    if (/require\(["']express["']\)/.test(content) || /from\s+["']express["']/.test(content) || /app\.(get|post|put|delete|use)\s*\(/.test(content)) return 'express'
    if (/from\s+["']@nestjs\//.test(content)) return 'nestjs'
    if (/from\s+django\./.test(content)) return 'django'
    if (/from\s+flask\s+import/.test(content)) return 'flask'
    return 'unknown'
}

function detectLibraries(fileContent: string): string[] {
    const libraries = new Set<string>()
    const esImportRegex = /import\s+(?:.*?\s+from\s+)?["'](@?[a-zA-Z0-9][\w\-./]*)["']/g
    let match: RegExpExecArray | null
    while ((match = esImportRegex.exec(fileContent)) !== null) {
        const pkg = normalizePackageName(match[1])
        if (pkg) libraries.add(pkg)
    }
    const requireRegex = /require\s*\(\s*["'](@?[a-zA-Z0-9][\w\-./]*)["']\s*\)/g
    while ((match = requireRegex.exec(fileContent)) !== null) {
        const pkg = normalizePackageName(match[1])
        if (pkg) libraries.add(pkg)
    }
    const pyImportRegex = /^(?:import|from)\s+([\w.]+)/gm
    while ((match = pyImportRegex.exec(fileContent)) !== null) {
        const pkg = match[1].split('.')[0]
        if (pkg && !PYTHON_STDLIB.has(pkg)) libraries.add(pkg)
    }
    return Array.from(libraries)
}

function normalizePackageName(raw: string): string | null {
    if (raw.startsWith('.') || raw.startsWith('/')) return null
    if (NODE_BUILTINS.has(raw)) return null
    if (raw.startsWith('@')) {
        const parts = raw.split('/')
        return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : raw
    }
    return raw.split('/')[0]
}

const NODE_BUILTINS = new Set(['fs','path','os','http','https','crypto','stream','util','events','buffer','child_process','cluster','dns','net','readline','tls','url','zlib','assert','module','process','querystring','string_decoder','timers','tty','v8','vm'])
const PYTHON_STDLIB = new Set(['os','sys','re','math','json','io','time','datetime','collections','functools','itertools','pathlib','typing','abc','copy','enum','logging','threading','multiprocessing','subprocess','socket','hashlib','base64','urllib','http','unittest','argparse','dataclasses','contextlib','string','random','struct','traceback','warnings','weakref'])

function detectIfInFunction(beforeCursor: string): boolean {
    const functionStartRegex = /(?:function\s*\*?\s*\w*\s*\(.*?\)|(?:(?:async|static|public|private|protected|export)\s+)*(?:function\s+\w+\s*\(.*?\)|\w+\s*(?:=\s*)?(?:async\s*)?\(.*?\)\s*=>)|(?:def|fn|func)\s+\w+\s*\(.*?\).*?[:{])/g
    const openBraces = (beforeCursor.match(/\{/g) ?? []).length
    const closeBraces = (beforeCursor.match(/\}/g) ?? []).length
    return functionStartRegex.test(beforeCursor) && (openBraces - closeBraces) > 0
}

function detectIfInClass(beforeCursor: string): boolean {
    const classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+\w+(?:\s+extends\s+[\w<>, ]+)?(?:\s+implements\s+[\w<>, ]+)?\s*\{/g
    const openBraces = (beforeCursor.match(/\{/g) ?? []).length
    const closeBraces = (beforeCursor.match(/\}/g) ?? []).length
    return classRegex.test(beforeCursor) && (openBraces - closeBraces) > 0
}

function detectIfInComment(beforeCursor: string): boolean {
    const lastBlockOpen = beforeCursor.lastIndexOf('/*')
    const lastBlockClose = beforeCursor.lastIndexOf('*/')
    if (lastBlockOpen !== -1 && lastBlockOpen > lastBlockClose) return true
    const currentLine = beforeCursor.split('\n').pop() ?? ''
    return /^\s*(\/\/|#)/.test(currentLine)
}

function generatePrompt(context: CodeContext, suggestionType: 'code' | 'comment'): string {
    const { language, framework, libraries, fileName, beforeCursorContent, afterCursorContent, selectedText, selectionRange, isInFunction, isInClass, isInComment, cursorPosition } = context
    const libList = libraries.length > 0 ? libraries.join(', ') : 'none detected'
    const locationHints = [isInFunction && 'inside a function', isInClass && 'inside a class', isInComment && 'inside a comment block'].filter(Boolean).join(', ') || 'top-level scope'
    const hasSelectedCode = Boolean(selectedText && selectedText.trim().length > 0)
    const task = suggestionType === 'comment'
        ? 'Write a concise, accurate JSDoc/docstring comment for the code at the cursor.'
        : hasSelectedCode
            ? 'Rewrite the selected code to improve it. You may remove, reorder, or refactor lines if needed. Return only replacement code for the selected range.'
            : 'Complete the code at the cursor position. Return only the inserted text, no explanations.'
    return `
You are an expert ${language} developer${framework !== 'unknown' ? ` using ${framework}` : ''}.
File: ${fileName ?? 'unknown'}
Language: ${language} | Framework: ${framework} | Libraries: ${libList}
Cursor: line ${cursorPosition.line}, column ${cursorPosition.column}
Location: ${locationHints}

Task: ${task}

### Code before cursor:
${beforeCursorContent}
<CURSOR>
### Code after cursor:
${afterCursorContent}
${hasSelectedCode ? `\n### Selected code range:\n${JSON.stringify(selectionRange ?? null)}\n\n### Selected code:\n${selectedText}` : ''}
`.trim()
}
