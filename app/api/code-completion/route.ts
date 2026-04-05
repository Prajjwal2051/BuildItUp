// This API route handles code completion requests from the client.
// It receives the current file content and cursor position,
// and returns a code suggestion based on that context.

import { type NextRequest, NextResponse } from 'next/server'

// BUG FIX: Removed the invalid/unused import:
//   import { metadata } from './../../../OrbitCode-starters/nextjs/app/layout'
// `metadata` from a layout file is a Next.js page export — it has no role in an API route.

interface CodeCompletionRequestBody {
  fileContent: string
  cursorLine: number
  cursorColumn: number
  suggestionType: 'code' | 'comment'
  fileName?: string
}

interface CodeContext {
  language: string
  framework: string
  libraries: string[]
  fileName?: string
  currentLineContent: string
  beforeCursorContent: string
  afterCursorContent: string
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
    const { fileContent, cursorLine, cursorColumn, suggestionType, fileName } = body

    if (
      typeof fileContent !== 'string' ||
      typeof cursorLine !== 'number' ||
      typeof cursorColumn !== 'number'
    ) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const context = extractCodeContext(fileContent, cursorLine, cursorColumn, fileName)
    const prompt = generatePrompt(context, suggestionType)
    const suggestion = await getCodeSuggestion(prompt)

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
): CodeContext {
  const lines = fileContent.split('\n')
  const currentLineContent = lines[cursorLine] || ''

  const contextRadius = 10
  const startLine = Math.max(0, cursorLine - contextRadius)
  const endLine = Math.min(lines.length - 1, cursorLine + contextRadius)

  const beforeCursorContent =
    lines.slice(startLine, cursorLine).join('\n') + '\n' + currentLineContent.slice(0, cursorColumn)

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

  return {
    language,
    framework,
    libraries,
    fileName,
    currentLineContent,
    beforeCursorContent,
    afterCursorContent,
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
// Infers language from file extension first, then falls back to content heuristics.
// ---------------------------------------------------------------------------

function detectLanguage(fileName?: string, fileContent?: string): string {
  if (fileName) {
    // Match the extension at the end of the filename
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

  // Content-based heuristics when no file name is available
  if (fileContent) {
    // Python: def keyword + colon, or import statements without braces
    if (/^\s*def\s+\w+\s*\(/m.test(fileContent) || /^import\s+\w+$/m.test(fileContent)) {
      return 'python'
    }
    // TypeScript: type annotations, interface/type keywords, generics
    if (
      /:\s*(string|number|boolean|void|any|never|unknown)\b/.test(fileContent) ||
      /\binterface\s+\w+/.test(fileContent) ||
      /\btype\s+\w+\s*=/.test(fileContent)
    ) {
      return 'typescript'
    }
    // Java/C#: class with access modifiers
    if (/\b(public|private|protected)\s+(class|static|void)\b/.test(fileContent)) {
      return 'java'
    }
    // Go: package declaration
    if (/^package\s+\w+/m.test(fileContent)) {
      return 'go'
    }
    // Rust: fn keyword with -> return type
    if (/\bfn\s+\w+\s*\(/.test(fileContent)) {
      return 'rust'
    }
    // Generic JavaScript fallback
    if (/\b(const|let|var|function|=>)\b/.test(fileContent)) {
      return 'javascript'
    }
  }

  return 'unknown'
}

// ---------------------------------------------------------------------------
// detectFramework
// Infers the frontend/backend framework from filename patterns and import statements.
// ---------------------------------------------------------------------------

function detectFramework(fileName?: string, fileContent?: string): string {
  const content = fileContent ?? ''

  // Next.js: app/pages directory conventions or next imports
  if (
    /["']next\//.test(content) ||
    /\b(NextRequest|NextResponse|getServerSideProps|getStaticProps)\b/.test(content) ||
    (fileName && /\/(app|pages)\/.*\.(tsx?|jsx?)$/.test(fileName))
  ) {
    return 'nextjs'
  }

  // React (must come after Next.js since Next.js also uses React)
  if (
    /["']react["']/.test(content) ||
    /from\s+["']react["']/.test(content) ||
    /<[A-Z][A-Za-z]+[\s/>]/.test(content)
  ) {
    return 'react'
  }

  // Vue
  if (/<template>/.test(content) || /from\s+["']vue["']/.test(content)) {
    return 'vue'
  }

  // Angular
  if (
    /@(Component|NgModule|Injectable|Directive)\s*\(/.test(content) ||
    /from\s+["']@angular\//.test(content)
  ) {
    return 'angular'
  }

  // Svelte
  if (fileName && /\.svelte$/.test(fileName)) {
    return 'svelte'
  }

  // Express
  if (
    /require\(["']express["']\)/.test(content) ||
    /from\s+["']express["']/.test(content) ||
    /app\.(get|post|put|delete|use)\s*\(/.test(content)
  ) {
    return 'express'
  }

  // NestJS
  if (/from\s+["']@nestjs\//.test(content)) {
    return 'nestjs'
  }

  // Django / Flask (Python)
  if (/from\s+django\./.test(content)) return 'django'
  if (/from\s+flask\s+import/.test(content)) return 'flask'

  return 'unknown'
}

// ---------------------------------------------------------------------------
// detectLibraries
// Scans import/require statements and returns a deduplicated list of libraries.
// ---------------------------------------------------------------------------

function detectLibraries(fileContent: string): string[] {
  const libraries = new Set<string>()

  // ES module imports: import ... from 'library' or import 'library'
  // Captures the package name (including scoped packages like @tanstack/react-query)
  const esImportRegex = /import\s+(?:.*?\s+from\s+)?["'](@?[a-zA-Z0-9][\w\-./]*)["']/g
  let match: RegExpExecArray | null

  while ((match = esImportRegex.exec(fileContent)) !== null) {
    const pkg = normalizePackageName(match[1])
    if (pkg) libraries.add(pkg)
  }

  // CommonJS require: require('library') or require("library")
  const requireRegex = /require\s*\(\s*["'](@?[a-zA-Z0-9][\w\-./]*)["']\s*\)/g
  while ((match = requireRegex.exec(fileContent)) !== null) {
    const pkg = normalizePackageName(match[1])
    if (pkg) libraries.add(pkg)
  }

  // Python imports: import library  /  from library import ...
  const pyImportRegex = /^(?:import|from)\s+([\w.]+)/gm
  while ((match = pyImportRegex.exec(fileContent)) !== null) {
    const pkg = match[1].split('.')[0] // top-level package only
    if (pkg && !PYTHON_STDLIB.has(pkg)) libraries.add(pkg)
  }

  return Array.from(libraries)
}

/** Strip sub-paths from a package name: 'lodash/fp' → 'lodash', '@mui/icons-material/Add' → '@mui/icons-material' */
function normalizePackageName(raw: string): string | null {
  // Skip relative imports and built-in Node modules
  if (raw.startsWith('.') || raw.startsWith('/')) return null
  if (NODE_BUILTINS.has(raw)) return null

  if (raw.startsWith('@')) {
    // Scoped package: keep @scope/name, drop anything after the second slash
    const parts = raw.split('/')
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : raw
  }

  // Unscoped: keep root package name only
  return raw.split('/')[0]
}

// Common Node.js built-in module names to exclude from library list
const NODE_BUILTINS = new Set([
  'fs',
  'path',
  'os',
  'http',
  'https',
  'crypto',
  'stream',
  'util',
  'events',
  'buffer',
  'child_process',
  'cluster',
  'dns',
  'net',
  'readline',
  'tls',
  'url',
  'zlib',
  'assert',
  'module',
  'process',
  'querystring',
  'string_decoder',
  'timers',
  'tty',
  'v8',
  'vm',
])

// Common Python stdlib top-level modules to exclude
const PYTHON_STDLIB = new Set([
  'os',
  'sys',
  're',
  'math',
  'json',
  'io',
  'time',
  'datetime',
  'collections',
  'functools',
  'itertools',
  'pathlib',
  'typing',
  'abc',
  'copy',
  'enum',
  'logging',
  'threading',
  'multiprocessing',
  'subprocess',
  'socket',
  'hashlib',
  'base64',
  'urllib',
  'http',
  'unittest',
  'argparse',
  'dataclasses',
  'contextlib',
  'string',
  'random',
  'struct',
  'traceback',
  'warnings',
  'weakref',
])

// ---------------------------------------------------------------------------
// detectIfInFunction
// Returns true if the cursor appears to be inside a function body.
// Handles JS/TS arrow functions, named functions, methods, Python defs, etc.
// ---------------------------------------------------------------------------

function detectIfInFunction(beforeCursor: string): boolean {
  // Match any function declaration/expression/arrow in JS/TS/Java/C#/Go/Rust
  const functionStartRegex =
    /(?:function\s*\*?\s*\w*\s*\(.*?\)|(?:(?:async|static|public|private|protected|export)\s+)*(?:function\s+\w+\s*\(.*?\)|\w+\s*(?:=\s*)?(?:async\s*)?\(.*?\)\s*=>)|(?:def|fn|func)\s+\w+\s*\(.*?\).*?[:{])/g

  const openBraces = (beforeCursor.match(/\{/g) ?? []).length
  const closeBraces = (beforeCursor.match(/\}/g) ?? []).length
  const unclosedBraces = openBraces - closeBraces

  // Must have at least one function keyword AND an unclosed brace/block
  return functionStartRegex.test(beforeCursor) && unclosedBraces > 0
}

// ---------------------------------------------------------------------------
// detectIfInClass
// Returns true if the cursor appears to be inside a class body.
// ---------------------------------------------------------------------------

function detectIfInClass(beforeCursor: string): boolean {
  // Matches: class Foo, class Foo extends Bar, abstract class Foo, etc.
  const classRegex =
    /(?:export\s+)?(?:abstract\s+)?class\s+\w+(?:\s+extends\s+[\w<>, ]+)?(?:\s+implements\s+[\w<>, ]+)?\s*\{/g

  const openBraces = (beforeCursor.match(/\{/g) ?? []).length
  const closeBraces = (beforeCursor.match(/\}/g) ?? []).length
  const unclosedBraces = openBraces - closeBraces

  return classRegex.test(beforeCursor) && unclosedBraces > 0
}

// ---------------------------------------------------------------------------
// detectIfInComment
// Returns true if the cursor is inside a block comment (/* ... */) or
// on a line that starts with a single-line comment (// or #).
// ---------------------------------------------------------------------------

function detectIfInComment(beforeCursor: string): boolean {
  // Check for an unclosed block comment /* ... (without a closing */)
  const lastBlockOpen = beforeCursor.lastIndexOf('/*')
  const lastBlockClose = beforeCursor.lastIndexOf('*/')
  if (lastBlockOpen !== -1 && lastBlockOpen > lastBlockClose) {
    return true
  }

  // Check if the current line (last line of beforeCursor) starts with // or #
  const currentLine = beforeCursor.split('\n').pop() ?? ''
  if (/^\s*(\/\/|#)/.test(currentLine)) {
    return true
  }

  return false
}

// ---------------------------------------------------------------------------
// generatePrompt
// Builds a structured prompt string from the extracted code context.
// ---------------------------------------------------------------------------

function generatePrompt(context: CodeContext, suggestionType: 'code' | 'comment'): string {
  const {
    language,
    framework,
    libraries,
    fileName,
    beforeCursorContent,
    afterCursorContent,
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

  const task =
    suggestionType === 'comment'
      ? 'Write a concise, accurate JSDoc/docstring comment for the code at the cursor.'
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
`.trim()
}

// ---------------------------------------------------------------------------
// getCodeSuggestion
// Sends the prompt to the AI model and returns the completion text.
// Replace the fetch URL / headers with your actual provider (OpenAI, Anthropic, etc.)
// ---------------------------------------------------------------------------

async function getCodeSuggestion(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set.')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
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
      max_tokens: 256,
      temperature: 0.2,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`AI API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() ?? ''
}
