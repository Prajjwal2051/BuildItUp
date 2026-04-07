// This API route handles code completion requests from the client.
// It receives the current file content and cursor position,
// and returns a code suggestion based on that context.

import { type NextRequest, NextResponse } from 'next/server'
import { resolveOllamaModel } from '@/lib/ollama'

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

        // BUG FIX 1: `suggestionType` is required by the downstream functions but was
        // never validated. A missing or wrong value would cause silent incorrect behaviour.
        if (
            typeof fileContent !== 'string' ||
            typeof cursorLine !== 'number' ||
            typeof cursorColumn !== 'number' ||
            (suggestionType !== 'code' && suggestionType !== 'comment')
        ) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
        }

        // BUG FIX 2: cursorLine / cursorColumn could be negative or non-integer
        // (e.g. 1.5 passes `typeof x === "number"`). Guard against that.
        if (
            cursorLine < 0 || !Number.isInteger(cursorLine) ||
            cursorColumn < 0 || !Number.isInteger(cursorColumn)
        ) {
            return NextResponse.json(
                { error: 'cursorLine and cursorColumn must be non-negative integers' },
                { status: 400 }
            )
        }

        const context = extractCodeContext(fileContent, cursorLine, cursorColumn, fileName, {
            selectionStartLine,
            selectionStartColumn,
            selectionEndLine,
            selectionEndColumn,
            selectedText,
        })
        const prompt = generatePrompt(context, suggestionType)
        const modelResolution = await resolveOllamaModel()

        if (!modelResolution.model) {
            return NextResponse.json(
                { error: modelResolution.error ?? 'No Ollama model is available' },
                { status: 503 },
            )
        }

        const suggestion = sanitizeCodeSuggestion(
            await getCodeSuggestion(prompt, modelResolution.model),
        )

        return NextResponse.json({
            suggestion,
            context,
            metadata: {
                language: context.language,
                framework: context.framework,
                libraries: context.libraries,
                generatedAt: new Date().toISOString(),
            },
        })
    } catch (error: any) {
        console.error('Error in code completion API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    // BUG FIX 3: When cursorLine === 0, `lines.slice(0, 0)` is an empty array, so
    // the join produced an empty string followed by a bare "\n" prefix — resulting in
    // beforeCursorContent starting with "\n". Guard with a conditional join separator.
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
        cursorPosition: {
            line: cursorLine,
            column: cursorColumn,
        },
        isInFunction,
        isInClass,
        isInComment,
    }
}

// ---------------------------------------------------------------------------
// detectLanguage
// ---------------------------------------------------------------------------

function detectLanguage(fileName?: string, fileContent?: string): string {
    if (fileName) {
        const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/)
        if (extMatch) {
            const ext = extMatch[1].toLowerCase()
            const extMap: Record<string, string> = {
                ts: 'typescript',
                tsx: 'typescript',
                js: 'javascript',
                jsx: 'javascript',
                py: 'python',
                rb: 'ruby',
                java: 'java',
                cs: 'csharp',
                cpp: 'cpp',
                c: 'c',
                go: 'go',
                rs: 'rust',
                php: 'php',
                swift: 'swift',
                kt: 'kotlin',
                html: 'html',
                css: 'css',
                scss: 'scss',
                json: 'json',
                md: 'markdown',
                yaml: 'yaml',
                yml: 'yaml',
                sh: 'bash',
                sql: 'sql',
            }
            if (extMap[ext]) return extMap[ext]
        }
    }

    if (fileContent) {
        if (/^\s*def\s+\w+\s*\(/m.test(fileContent) || /^import\s+\w+$/m.test(fileContent)) {
            return 'python'
        }
        if (
            /:\s*(string|number|boolean|void|any|never|unknown)\b/.test(fileContent) ||
            /\binterface\s+\w+/.test(fileContent) ||
            /\btype\s+\w+\s*=/.test(fileContent)
        ) {
            return 'typescript'
        }
        if (/\b(public|private|protected)\s+(class|static|void)\b/.test(fileContent)) {
            return 'java'
        }
        if (/^package\s+\w+/m.test(fileContent)) {
            return 'go'
        }
        if (/\bfn\s+\w+\s*\(/.test(fileContent)) {
            return 'rust'
        }
        if (/\b(const|let|var|function|=>)\b/.test(fileContent)) {
            return 'javascript'
        }
    }

    return 'unknown'
}

// ---------------------------------------------------------------------------
// detectFramework
// ---------------------------------------------------------------------------

function detectFramework(fileName?: string, fileContent?: string): string {
    const content = fileContent ?? ''

    if (
        /["']next\//.test(content) ||
        /\b(NextRequest|NextResponse|getServerSideProps|getStaticProps)\b/.test(content) ||
        (fileName && /\/(app|pages)\/.*\.(tsx?|jsx?)$/.test(fileName))
    ) {
        return 'nextjs'
    }

    if (
        /["']react["']/.test(content) ||
        /from\s+["']react["']/.test(content) ||
        /<[A-Z][A-Za-z]+[\s/>]/.test(content)
    ) {
        return 'react'
    }

    if (/<template>/.test(content) || /from\s+["']vue["']/.test(content)) {
        return 'vue'
    }

    if (
        /@(Component|NgModule|Injectable|Directive)\s*\(/.test(content) ||
        /from\s+["']@angular\//.test(content)
    ) {
        return 'angular'
    }

    if (fileName && /\.svelte$/.test(fileName)) {
        return 'svelte'
    }

    if (
        /require\(["']express["']\)/.test(content) ||
        /from\s+["']express["']/.test(content) ||
        /app\.(get|post|put|delete|use)\s*\(/.test(content)
    ) {
        return 'express'
    }

    if (/from\s+["']@nestjs\//.test(content)) {
        return 'nestjs'
    }

    if (/from\s+django\./.test(content)) return 'django'
    if (/from\s+flask\s+import/.test(content)) return 'flask'

    return 'unknown'
}

// ---------------------------------------------------------------------------
// detectLibraries
// ---------------------------------------------------------------------------

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

const NODE_BUILTINS = new Set([
    'fs', 'path', 'os', 'http', 'https', 'crypto', 'stream', 'util',
    'events', 'buffer', 'child_process', 'cluster', 'dns', 'net',
    'readline', 'tls', 'url', 'zlib', 'assert', 'module', 'process',
    'querystring', 'string_decoder', 'timers', 'tty', 'v8', 'vm',
])

const PYTHON_STDLIB = new Set([
    'os', 'sys', 're', 'math', 'json', 'io', 'time', 'datetime',
    'collections', 'functools', 'itertools', 'pathlib', 'typing',
    'abc', 'copy', 'enum', 'logging', 'threading', 'multiprocessing',
    'subprocess', 'socket', 'hashlib', 'base64', 'urllib', 'http',
    'unittest', 'argparse', 'dataclasses', 'contextlib', 'string',
    'random', 'struct', 'traceback', 'warnings', 'weakref',
])

// ---------------------------------------------------------------------------
// detectIfInFunction
// ---------------------------------------------------------------------------

function detectIfInFunction(beforeCursor: string): boolean {
    const functionStartRegex =
        /(?:function\s*\*?\s*\w*\s*\(.*?\)|(?:(?:async|static|public|private|protected|export)\s+)*(?:function\s+\w+\s*\(.*?\)|\w+\s*(?:=\s*)?(?:async\s*)?\(.*?\)\s*=>)|(?:def|fn|func)\s+\w+\s*\(.*?\).*?[:{])/g

    const openBraces = (beforeCursor.match(/\{/g) ?? []).length
    const closeBraces = (beforeCursor.match(/\}/g) ?? []).length
    const unclosedBraces = openBraces - closeBraces

    return functionStartRegex.test(beforeCursor) && unclosedBraces > 0
}

// ---------------------------------------------------------------------------
// detectIfInClass
// ---------------------------------------------------------------------------

function detectIfInClass(beforeCursor: string): boolean {
    const classRegex =
        /(?:export\s+)?(?:abstract\s+)?class\s+\w+(?:\s+extends\s+[\w<>, ]+)?(?:\s+implements\s+[\w<>, ]+)?\s*\{/g

    const openBraces = (beforeCursor.match(/\{/g) ?? []).length
    const closeBraces = (beforeCursor.match(/\}/g) ?? []).length
    const unclosedBraces = openBraces - closeBraces

    return classRegex.test(beforeCursor) && unclosedBraces > 0
}

// ---------------------------------------------------------------------------
// detectIfInComment
// ---------------------------------------------------------------------------

function detectIfInComment(beforeCursor: string): boolean {
    const lastBlockOpen = beforeCursor.lastIndexOf('/*')
    const lastBlockClose = beforeCursor.lastIndexOf('*/')
    if (lastBlockOpen !== -1 && lastBlockOpen > lastBlockClose) {
        return true
    }

    const currentLine = beforeCursor.split('\n').pop() ?? ''
    if (/^\s*(\/\/|#)/.test(currentLine)) {
        return true
    }

    return false
}

// ---------------------------------------------------------------------------
// generatePrompt
// ---------------------------------------------------------------------------

function generatePrompt(context: CodeContext, suggestionType: 'code' | 'comment'): string {
    const {
        language,
        framework,
        libraries,
        fileName,
        beforeCursorContent,
        afterCursorContent,
        selectedText,
        selectionRange,
        isInFunction,
        isInClass,
        isInComment,
        cursorPosition,
    } = context

    const libList = libraries.length > 0 ? libraries.join(', ') : 'none detected'
    const locationHints =
        [
            isInFunction && 'inside a function',
            isInClass && 'inside a class',
            isInComment && 'inside a comment block',
        ]
            .filter(Boolean)
            .join(', ') || 'top-level scope'

    const hasSelectedCode = Boolean(selectedText && selectedText.trim().length > 0)
    const task =
        suggestionType === 'comment'
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

// ---------------------------------------------------------------------------
// getCodeSuggestion
// Calls the local Ollama instance using the CORRECT /api/chat endpoint and
// request body shape.
// ---------------------------------------------------------------------------

async function getCodeSuggestion(prompt: string, model: string): Promise<string> {
    try {
        // BUG FIX 4 (CRITICAL): The original code called `/api/generate` but sent a
        // `messages` array in the body. `/api/generate` does NOT accept `messages` —
        // that field is silently ignored, so the model received no input and returned
        // an empty response every time.
        // The correct endpoint for message-based chat with Ollama is `/api/chat`.
        // [web:20][web:27]

        // BUG FIX 5 (CRITICAL): `max_tokens` and `temperature` are NOT top-level fields
        // for either Ollama endpoint. They must be nested inside an `options` object.
        // Placing them at the top level means they are silently ignored by Ollama. [web:35]

        // BUG FIX 6: Model name was `'Qwen2.5-code'` — Ollama model names are
        // lowercase with a colon tag, e.g. `'qwen2.5-coder:7b'`. An incorrect name
        // causes a 404 / "model not found" error from Ollama.

        const response = await fetch('http://localhost:11434/api/chat', {   // FIX 4
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                stream: false,
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are a code completion engine. Return ONLY the raw code to be inserted at the cursor. No markdown fences, no explanations.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                options: {                                                   // FIX 5
                    temperature: 0.2,
                    num_predict: 256,   // Ollama uses `num_predict`, not `max_tokens`
                },
            }),
        })

        if (!response.ok) {
            const err = await response.text()
            console.error(`AI API error ${response.status}: ${err}`)
            return ''
        }

        const data = await response.json()

        // BUG FIX 7: The original response path `data.choices?.[0]?.message?.content`
        // is the OpenAI response shape. Ollama's /api/chat response shape is
        // `data.message.content` — using the OpenAI path always returns undefined. [web:20]
        return data.message?.content?.trim() ?? ''                          // FIX 7

    } catch (error) {
        console.error('Error fetching code suggestion:', error)
        return ''
    }
}

// Removes markdown fences so the editor always receives plain insertable code.
function sanitizeCodeSuggestion(suggestion: string): string {
    const trimmedSuggestion = suggestion.trim()

    // Handles the common case where the model wraps the whole output in one fenced block.
    const fencedBlockMatch = trimmedSuggestion.match(/^```[\w-]*\n?([\s\S]*?)\n?```$/)
    if (fencedBlockMatch) {
        return fencedBlockMatch[1].trimEnd()
    }

    const suggestionLines = trimmedSuggestion.split('\n')

    if (suggestionLines[0]?.trimStart().startsWith('```')) {
        suggestionLines.shift()
    }

    if (suggestionLines[suggestionLines.length - 1]?.trim() === '```') {
        suggestionLines.pop()
    }

    return suggestionLines.join('\n').trimEnd()
}