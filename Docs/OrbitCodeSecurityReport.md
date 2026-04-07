# BuildItUp — Comprehensive Security Vulnerability Report

**Repository:** [https://github.com/Prajjwal2051/BuildItUp](https://github.com/Prajjwal2051/BuildItUp)  
**Stack:** Next.js 15 (App Router), NextAuth v5, Prisma ORM, MongoDB  
**Audit Date:** April 2026  
**Severity Scale:** Critical → High → Medium → Low  

---

## Executive Summary

This report documents ten confirmed security vulnerabilities discovered during a full code-base audit of BuildItUp — a browser-based code playground application. The most critical class of issue is **Insecure Direct Object Reference (IDOR)**, which affects every single data mutation and read path in the application. Any authenticated user can read, overwrite, delete, or clone any other user's private playground or template by supplying a valid database ID. In addition, dangerous OAuth account-linking configuration increases account-takeover risk, a local AI endpoint is hardcoded, and error handling silently swallows failures throughout the server action layer. All issues are evidence-backed with exact file locations and complete, drop-in code fixes.

---

## Vulnerability Overview

| # | Title | Severity | File(s) | Attack Surface |
|---|-------|----------|---------|---------------|
| 1 | IDOR on Playground Read API | High | `app/api/playground/[id]/route.ts` | Cross-user data exposure |
| 2 | IDOR on Template Read/Write API | High | `app/api/template/[id]/route.ts` | Cross-user content tampering |
| 3 | IDOR on Dashboard Delete/Edit Actions | High | `modules/dashboard/actions/index.ts` (L103, L130) | Cross-user mutation |
| 4 | IDOR on Duplicate Action | High | `modules/dashboard/actions/index.ts` (L155) | Unauthorized IP copying |
| 5 | IDOR on Template Save Action | High | `modules/dashboard/actions/index.ts` (L39–41) | Cross-tenant content upsert |
| 6 | Dangerous OAuth Account Linking | Medium | `auth.config.ts` (L16, L21) | Account takeover |
| 7 | Production Dependency Vulnerabilities | Medium | `package.json` / npm audit | Client-side XSS surface |
| 8 | Hardcoded Local AI Backend Endpoint | Medium | `app/api/ai-chat/route.ts` (L32), `app/api/code-completion/route.ts` (L443) | Deployment misrouting |
| 9 | Sensitive Values in Local `.env` File | Low | `.env` (local only) | Local secret hygiene |
| 10 | Error Swallowing and Malformed Log Strings | Low | `modules/dashboard/actions/index.ts` (L111, L141, L185) | Silent failures |

---

## Understanding IDOR (Insecure Direct Object Reference)

### What It Is

An IDOR vulnerability occurs when an application uses a user-supplied identifier (such as a database record ID) to access or mutate a resource **without verifying that the requesting user has permission to access that specific resource.** The attacker simply substitutes someone else's ID in the request.

### Why It Is Dangerous in This Codebase

BuildItUp stores user-created playgrounds and templates in MongoDB via Prisma. Every playground has a globally unique `id` (a CUID or MongoDB ObjectId string). Because the IDs are opaque, the developer may have assumed they are "secret enough" — this is the **security by obscurity** fallacy. IDs leak through:

- Browser URL bars (`/playground/clxxxxxxxxxxxxxxxx`)
- Network tab in DevTools during any API call
- Error messages or logs
- Shared links
- Enumeration attacks (sequential CUID prefixes are partially predictable)

### The Missing Concept: Ownership Enforcement

Every data operation must answer two questions:

1. **Is the requester authenticated?** (Already done — middleware blocks unauthenticated requests)
2. **Does the authenticated user own the resource they are asking to modify?** (Currently **never checked** in the affected routes)

The fix pattern is always the same: **include `userId` in the Prisma `where` clause alongside the resource `id`.** Prisma will then return `null` if the record exists but belongs to a different user, which is treated identically to "not found."

---

## HIGH Severity Vulnerabilities

### 1. IDOR on Playground Read API

**File:** `app/api/playground/[id]/route.ts`

#### The Problem

The `GET` handler fetches a playground record using only the playground `id` from the URL. No session check is performed inside the route handler. Any authenticated user who knows (or guesses) a playground ID can retrieve another user's full project metadata including title, description, template type, and entire code state.

**Vulnerable code (current):**

```typescript
// app/api/playground/[id]/route.ts — VULNERABLE
async function GET(_request: NextRequest, context: { params: RouteParams | Promise<RouteParams> }) {
    const resolvedParams = await Promise.resolve(context.params)
    const id = getRouteId(resolvedParams)

    if (!id) {
        return Response.json({ error: 'Playground ID is required' }, { status: 400 })
    }

    try {
        const playground = await db.playground.findUnique({
            where: { id },          // ← NO userId check. Fetches ANY playground by ID.
            select: { ... },
        })
        // ...
    }
}
```

#### The Fix

Import the `auth()` helper from NextAuth, resolve the session, and add `userId` to the `where` clause. If the playground exists but belongs to a different user, Prisma returns `null` and the handler correctly responds with 404 — no information leakage.

**Fixed code:**

```typescript
// app/api/playground/[id]/route.ts — FIXED
import { db } from '@/lib/db'
import { auth } from '@/auth'           // ← Add this import
import { NextRequest } from 'next/server'

type RouteParams = { id?: string | string[] }

function getRouteId(params: RouteParams): string | null {
    const rawId = params.id
    if (!rawId) return null
    if (Array.isArray(rawId)) return rawId[0] ?? null
    return rawId
}

async function GET(request: NextRequest, context: { params: RouteParams | Promise<RouteParams> }) {
    // Step 1: Resolve session — reject if unauthenticated
    const session = await auth()        // ← NEW
    if (!session?.user?.id) {           // ← NEW
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(context.params)
    const id = getRouteId(resolvedParams)

    if (!id) {
        return Response.json({ error: 'Playground ID is required' }, { status: 400 })
    }

    try {
        const playground = await db.playground.findUnique({
            where: {
                id,
                userId: session.user.id,  // ← NEW: ownership enforcement
            },
            select: {
                id: true,
                title: true,
                description: true,
                template: true,
                code: true,
                createdAt: true,
                updatedAt: true,
            },
        })

        if (!playground) {
            // Returns 404 whether the playground doesn't exist OR belongs to another user.
            // This prevents user enumeration (attacker cannot distinguish the two cases).
            return Response.json({ error: 'Playground not found' }, { status: 404 })
        }

        const templateFile = await db.templateFile.findUnique({
            where: { playgroundId: id },
            select: { id: true, content: true, updatedAt: true },
        })

        return Response.json(
            { ...playground, templateFile: templateFile ?? null },
            { status: 200 },
        )
    } catch (error) {
        console.error('Error fetching playground:', error)
        return Response.json({ error: 'Failed to fetch playground data' }, { status: 500 })
    }
}

export { GET }
```

#### Why the 404 Response for Unauthorized Access?

Returning `403 Forbidden` instead of `404` would confirm to an attacker that a playground with that ID exists but they are not allowed to see it. This is an **oracle** — it confirms the ID is valid and allows enumeration. Always return `404` for "not found OR not yours" to avoid leaking resource existence.

---

### 2. IDOR on Template Read/Write API

**File:** `app/api/template/[id]/route.ts`

#### The Problem

Both `GET` and `PUT` handlers operate on template files keyed by `playgroundId` with no session or ownership check. A malicious authenticated user can:

- **GET**: Read the full code snapshot (file tree JSON) of any user's playground
- **PUT**: Overwrite the file tree of any user's playground with arbitrary content, effectively destroying their work or injecting malicious code

**Vulnerable GET (current):**
```typescript
// No session check, no userId filter
const templateFile = await db.templateFile.findUnique({
    where: { playgroundId: id },  // ← Any authenticated user can read any template
})
```

**Vulnerable PUT (current):**
```typescript
// Confirms playground exists, but does NOT check ownership before upsert
const playground = await db.playground.findUnique({
    where: { id },
    select: { id: true },         // ← Fetches by ID only — no userId enforcement
})
// Then proceeds to upsert templateFile unconditionally...
```

#### The Fix — GET Handler

```typescript
// app/api/template/[id]/route.ts — FIXED GET
import { auth } from '@/auth'

async function GET(_request: NextRequest, context: { params: RouteParams | Promise<RouteParams> }) {
    const session = await auth()
    if (!session?.user?.id) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(context.params)
    const id = getRouteId(resolvedParams)

    if (!id) {
        return Response.json({ error: 'Playground ID is required' }, { status: 400 })
    }

    try {
        // First verify ownership — prevents leaking template content of other users
        const playground = await db.playground.findUnique({
            where: { id, userId: session.user.id },  // ← ownership check
            select: { id: true, template: true, code: true },
        })

        if (!playground) {
            return Response.json({ error: 'Playground not found' }, { status: 404 })
        }

        const templateFile = await db.templateFile.findUnique({
            where: { playgroundId: id },
            select: { content: true, updatedAt: true },
        })

        // ... rest of content normalization logic unchanged
    }
}
```

#### The Fix — PUT Handler

```typescript
// app/api/template/[id]/route.ts — FIXED PUT
async function PUT(request: NextRequest, context: { params: RouteParams | Promise<RouteParams> }) {
    const session = await auth()
    if (!session?.user?.id) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(context.params)
    const id = getRouteId(resolvedParams)

    if (!id) {
        return Response.json({ error: 'Playground ID is required' }, { status: 400 })
    }

    let payload: { content?: unknown }
    try {
        payload = await request.json()
    } catch {
        return Response.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (payload.content === undefined || payload.content === null) {
        return Response.json({ error: 'Template content is required' }, { status: 400 })
    }

    const content = payload.content as Prisma.InputJsonValue

    try {
        // Verify ownership before any write operation
        const playground = await db.playground.findUnique({
            where: { id, userId: session.user.id },  // ← ownership check
            select: { id: true },
        })

        if (!playground) {
            return Response.json({ error: 'Playground not found' }, { status: 404 })
        }

        const savedTemplate = await db.templateFile.upsert({
            where: { playgroundId: id },
            update: { content },
            create: { playgroundId: id, content },
            select: { id: true, updatedAt: true },
        })

        return Response.json(
            { success: true, templateFileId: savedTemplate.id, updatedAt: savedTemplate.updatedAt },
            { status: 200 },
        )
    } catch (error) {
        console.error('Error saving template file:', error)
        return Response.json({ error: 'Failed to save template data' }, { status: 500 })
    }
}
```

---

### 3. IDOR on Dashboard Delete and Edit Actions

**File:** `modules/dashboard/actions/index.ts` — `deletePlaygroundById` (line ~103), `editPlaygroundById` (line ~130)

#### The Problem

Both server actions verify login (`currentUser()` check) but then pass the `playgroundId` directly into the Prisma `where` clause **without scoping to the current user.** An attacker who discovers a valid playground ID can delete or rename anyone's project.

**Vulnerable `deletePlaygroundById`:**
```typescript
async function deletePlaygroundById(playgroundId: string) {
    const user = await currentUser()
    if (!user) throw new Error('Unauthorized')

    try {
        const deletedPlayground = await db.playground.delete({
            where: {
                id: playgroundId,   // ← No userId constraint — deletes ANY playground
            },
        })
        // ...
    }
}
```

**Vulnerable `editPlaygroundById`:**
```typescript
async function editPlaygroundById(playgroundId: string, data: {...}) {
    const user = await currentUser()
    if (!user) throw new Error('Unauthorized')

    try {
        const updatedPlayground = await db.playground.update({
            where: {
                id: playgroundId,   // ← No userId constraint — updates ANY playground
            },
            data: { title: data.title, description: data.description },
        })
        // ...
    }
}
```

#### The Fix — Delete

```typescript
// modules/dashboard/actions/index.ts — FIXED deletePlaygroundById
async function deletePlaygroundById(playgroundId: string) {
    const user = await currentUser()
    if (!user) throw new Error('Unauthorized')

    try {
        // Prisma will throw P2025 (RecordNotFound) if the record doesn't exist
        // OR if userId doesn't match — treat both as "not found"
        const deletedPlayground = await db.playground.delete({
            where: {
                id: playgroundId,
                userId: user.id,    // ← ownership enforcement
            },
        })
        revalidatePath('/dashboard')
        return deletedPlayground
    } catch (error) {
        // Distinguish "not found/unauthorized" from other errors
        if ((error as { code?: string }).code === 'P2025') {
            throw new Error('Playground not found or access denied')
        }
        console.error(`Error deleting playground ${playgroundId}:`, error)
        throw new Error('Failed to delete playground')  // ← throw instead of silent swallow
    }
}
```

#### The Fix — Edit

```typescript
// modules/dashboard/actions/index.ts — FIXED editPlaygroundById
async function editPlaygroundById(
    playgroundId: string,
    data: { title?: string; description?: string },
) {
    const user = await currentUser()
    if (!user) throw new Error('Unauthorized')

    try {
        const updatedPlayground = await db.playground.update({
            where: {
                id: playgroundId,
                userId: user.id,    // ← ownership enforcement
            },
            data: {
                title: data.title,
                description: data.description,
            },
        })
        revalidatePath('/dashboard')
        return updatedPlayground
    } catch (error) {
        if ((error as { code?: string }).code === 'P2025') {
            throw new Error('Playground not found or access denied')
        }
        console.error(`Error updating playground ${playgroundId}:`, error)
        throw new Error('Failed to update playground')
    }
}
```

> **Note on Prisma Compound Unique Constraints:** The `delete` and `update` methods in Prisma v5+ support compound `where` filters when no unique constraint exists on `userId` alone — the ORM generates a `WHERE id = ? AND userId = ?` SQL clause automatically. No schema changes are required.

---

### 4. IDOR on Duplicate Action — Unauthorized IP Cloning

**File:** `modules/dashboard/actions/index.ts` — `duplicatePlaygroundById` (line ~155)

#### The Problem

The duplicate flow fetches the original playground by ID with no ownership check, then creates a copy for the current user. This lets any authenticated user:

1. Clone another user's private project and its full source code into their own account
2. Exfiltrate intellectual property without detection
3. Inflate the victim's playground count in database metrics

**Vulnerable code:**
```typescript
async function duplicatePlaygroundById(playground: string) {
    const user = await currentUser()
    if (!user) throw new Error('Unauthorized')

    try {
        const originalPlayground = await db.playground.findUnique({
            where: { id: playground },  // ← No ownership check on source
        })
        if (!originalPlayground) throw new Error('Playground not found')

        const duplicatePlayground = await db.playground.create({
            data: {
                title: originalPlayground.title + ' (Copy)',
                template: originalPlayground.template,
                description: originalPlayground.description,
                code: originalPlayground.code,     // ← Full source code copied
                userId: user.id,
            },
        })
        // ...
    }
}
```

#### The Fix

```typescript
// modules/dashboard/actions/index.ts — FIXED duplicatePlaygroundById
async function duplicatePlaygroundById(playgroundId: string) {
    const user = await currentUser()
    if (!user) throw new Error('Unauthorized')

    try {
        // Only allow duplicating playgrounds the current user owns.
        // Future feature: add a `isPublic` field to allow cloning shared/public playgrounds.
        const originalPlayground = await db.playground.findUnique({
            where: {
                id: playgroundId,
                userId: user.id,    // ← ownership enforcement: can only duplicate own playgrounds
            },
        })

        if (!originalPlayground) {
            throw new Error('Playground not found or access denied')
        }

        const duplicatePlayground = await db.playground.create({
            data: {
                title: originalPlayground.title + ' (Copy)',
                template: originalPlayground.template,
                description: originalPlayground.description,
                code: originalPlayground.code,
                userId: user.id,
            },
        })
        revalidatePath('/dashboard')
        return duplicatePlayground
    } catch (error) {
        if ((error as { code?: string }).code === 'P2025') {
            throw new Error('Playground not found or access denied')
        }
        console.error(`Error duplicating playground ${playgroundId}:`, error)
        throw new Error('Failed to duplicate playground')
    }
}
```

#### Future: Public Playgrounds

If you ever add a feature allowing users to share or publish playgrounds, the ownership check must become conditional:

```typescript
where: {
    id: playgroundId,
    OR: [
        { userId: user.id },       // owns it
        { isPublic: true },         // OR it's explicitly public
    ],
},
```

Never expose private data as a side effect of a "duplicate" feature.

---

### 5. IDOR on Playground Template Save Action (Server Action Layer)

**File:** `modules/dashboard/actions/index.ts` — `createPlayground` (line ~39–41) and any server action that upserts template data by arbitrary playgroundId

#### The Problem

While `createPlayground` itself is safe (it uses `user.id` for the new record), the template-save pathway in `app/api/template/[id]/route.ts` PUT handler (covered in #2) is the primary concern. Additionally, the `togglePlaygroundStarMark` action is the **only** server action that already correctly does an ownership check before mutation — this should serve as the template for all other actions.

**Reference: the correct pattern already in the codebase (togglePlaygroundStarMark):**
```typescript
// This is the CORRECT pattern — already implemented for star marks
const playground = await db.playground.findUnique({
    where: { id: playgroundId },
    select: { id: true, userId: true },
})

if (!playground || playground.userId !== user.id) {
    throw new Error('Playground not found')
}
// Only then proceed with mutation
```

All other actions should adopt this same guard pattern (or the compound `where: { id, userId }` Prisma syntax).

---

## MEDIUM Severity Vulnerabilities

### 6. Dangerous OAuth Account Linking

**File:** `auth.config.ts` lines 16 and 21

#### The Problem

```typescript
// auth.config.ts — CURRENT (insecure)
GitHub({
    clientId: process.env.GITHUB_ID!,
    clientSecret: process.env.GITHUB_SECRET!,
    allowDangerousEmailAccountLinking: true,   // ← Dangerous flag enabled
}),
Google({
    clientId: process.env.GOOGLE_ID!,
    clientSecret: process.env.GOOGLE_SECRET!,
    allowDangerousEmailAccountLinking: true,   // ← Dangerous flag enabled
}),
```

`allowDangerousEmailAccountLinking: true` instructs NextAuth to automatically merge any incoming OAuth identity with an existing account **if they share the same email address.** This is dangerous because:

1. **OAuth provider email verification is not universal.** Some providers let users claim unverified email addresses. An attacker can register a GitHub account with `victim@gmail.com` (GitHub does not require email verification by default for all scenarios) and then link it directly to the victim's BuildItUp Google account.

2. **Account takeover without the victim's consent.** The victim receives no notification or confirmation step before the attacker's OAuth identity is linked.

3. **Email-confirmation phishing.** If the attacker controls a provider account with the target email, they gain full access to the victim's playgrounds, templates, and data.

#### The Fix

```typescript
// auth.config.ts — FIXED
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import type { NextAuthConfig } from 'next-auth'

export default {
    trustHost: true,
    pages: {
        signIn: '/auth/sign-in',
    },
    providers: [
        GitHub({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
            // allowDangerousEmailAccountLinking removed — default is false
        }),
        Google({
            clientId: process.env.GOOGLE_ID!,
            clientSecret: process.env.GOOGLE_SECRET!,
            // allowDangerousEmailAccountLinking removed — default is false
        }),
    ],
} satisfies NextAuthConfig
```

#### Implementing Explicit Account Linking (Recommended)

With `allowDangerousEmailAccountLinking: false`, NextAuth will throw an `OAuthAccountNotLinked` error when a user tries to sign in with a different provider for an existing email. Handle this gracefully:

```typescript
// app/auth/sign-in/page.tsx — handle OAuthAccountNotLinked
// Detect error=OAuthAccountNotLinked in searchParams and display:
<p>
  An account with this email already exists. Please sign in with the
  original provider you used, then link additional providers from your
  account settings.
</p>
```

Then build an explicit "Link Account" flow in account settings where the user — while already authenticated — can add a second OAuth provider. This is safer because it requires the user to be logged in before linking.

---

### 7. Production Dependency Vulnerabilities (npm audit)

**File:** `package.json` (transitive via `monaco-editor` → `dompurify`)

#### The Problem

`npm audit` reported moderate-severity vulnerabilities in the `dompurify` package pulled in transitively through `monaco-editor`. DOMPurify is a client-side HTML sanitizer. Vulnerabilities in DOMPurify can create XSS (Cross-Site Scripting) attack surfaces depending on which code paths use it and whether user-controlled HTML is passed through the affected version.

#### The Fix

```bash
# Step 1: Check current audit status
npm audit --production

# Step 2: Update dependencies aggressively (non-breaking)
npm update

# Step 3: If the transitive chain cannot be resolved by npm update,
# add a resolution override in package.json:
```

```json
// package.json — add overrides section (npm v8.3+)
{
  "overrides": {
    "dompurify": "^3.2.0"
  }
}
```

```bash
# Step 4: Reinstall and re-audit
npm install
npm audit --production
```

If the upstream `monaco-editor` package has not yet adopted the patched `dompurify`, pin the override and track the advisory. Consider filing an issue with the `monaco-editor` maintainers. Regularly run `npm audit` in CI to catch new vulnerabilities automatically.

---

### 8. Hardcoded Local AI Backend Endpoint

**Files:** `app/api/ai-chat/route.ts` line 32, `app/api/code-completion/route.ts` (similar pattern)

#### The Problem

```typescript
// app/api/ai-chat/route.ts — CURRENT (hardcoded)
const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    // ...
})
```

`http://localhost:11434` is the default Ollama endpoint. Hardcoding it causes:

1. **Deployment failure** — In production (Vercel, Railway, Docker), `localhost` inside a server action refers to the Next.js process container, not the developer's machine. Ollama won't be running there.
2. **Security misrouting** — If a different service happens to be running on port 11434 in production, requests are silently misdirected.
3. **No startup validation** — The application boots without warning even when the AI backend is unreachable, leading to runtime 503s that are hard to diagnose.

#### The Fix

```typescript
// lib/ai-config.ts — NEW FILE: centralized AI config with validation
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL

if (!OLLAMA_BASE_URL) {
    // Warn at startup — do not throw so the app can run without AI features
    console.warn(
        '[AI Config] OLLAMA_BASE_URL is not set. AI features will be disabled. ' +
        'Set OLLAMA_BASE_URL=http://localhost:11434 for local development.'
    )
}

// Allowlist of permitted Ollama base URLs to prevent SSRF via env injection
const ALLOWED_OLLAMA_SCHEMES = ['http:', 'https:']

export function getOllamaBaseUrl(): string {
    if (!OLLAMA_BASE_URL) {
        throw new Error('OLLAMA_BASE_URL environment variable is not configured')
    }

    let parsed: URL
    try {
        parsed = new URL(OLLAMA_BASE_URL)
    } catch {
        throw new Error(`OLLAMA_BASE_URL is not a valid URL: ${OLLAMA_BASE_URL}`)
    }

    if (!ALLOWED_OLLAMA_SCHEMES.includes(parsed.protocol)) {
        throw new Error(`OLLAMA_BASE_URL uses disallowed scheme: ${parsed.protocol}`)
    }

    return OLLAMA_BASE_URL
}
```

```typescript
// app/api/ai-chat/route.ts — FIXED
import { getOllamaBaseUrl } from '@/lib/ai-config'

// Inside the POST handler:
let ollamaBaseUrl: string
try {
    ollamaBaseUrl = getOllamaBaseUrl()
} catch (configError) {
    return NextResponse.json(
        { error: 'AI service is not configured. Contact your administrator.' },
        { status: 503 },
    )
}

const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
    method: 'POST',
    // ...
})
```

```bash
# .env.local (development)
OLLAMA_BASE_URL=http://localhost:11434

# .env.production (set in your deployment platform's secret manager)
OLLAMA_BASE_URL=https://your-ollama-deployment.example.com
```

The URL scheme allowlist prevents **Server-Side Request Forgery (SSRF)**: if an attacker were to tamper with environment variables (e.g., via a CI/CD misconfiguration), they cannot redirect AI requests to arbitrary internal endpoints like `file://`, `ftp://`, or `gopher://`.

---

## LOW Severity Vulnerabilities

### 9. Sensitive Values in Local `.env` File

**File:** `.env` (local, not committed — `.gitignore` line 34 correctly excludes it)

#### The Problem

The `.env` file contains OAuth secrets (`GITHUB_SECRET`, `GOOGLE_SECRET`), the `AUTH_SECRET` (NextAuth signing key), and the database connection string. While the file is correctly gitignored, secrets stored in local `.env` files carry risk:

- Developer machine compromise exposes all secrets
- Accidental sharing (email, Slack, screenshot) leaks credentials
- Secrets are often copied to `.env.example` files and committed by mistake
- No rotation tracking — it's unclear when secrets were last rotated

#### The Fix

For solo development: acceptable if the machine is secured. For team/production:

1. **Use a secret manager** (HashiCorp Vault, Doppler, AWS Secrets Manager, Infisical) instead of `.env` files for production credentials.
2. **Rotate credentials immediately** if they were ever shared (even momentarily) in a chat, email, or screenshot.
3. **Scope OAuth app permissions minimally** — GitHub and Google OAuth apps should only request the scopes your application actually uses.
4. **Audit `.env.example`** to ensure it contains only placeholder values, not real secrets.

```bash
# Verify .env is excluded
git ls-files --error-unmatch .env  # Should error — file should not be tracked
git log --all --full-history -- .env  # Confirm it was never committed
```

---

### 10. Silent Error Swallowing and Malformed Log Template Strings

**File:** `modules/dashboard/actions/index.ts` — lines ~111, ~141, ~185

#### The Problem

Three server actions `catch` errors and log them but **do not re-throw**, causing silent failures:

```typescript
// CURRENT — silent failure pattern (lines 111, 141, 185)
} catch (error) {
    console.log(`Error deleting playground with id ${playgroundId}:, error)`)
    //                                                               ↑ BUG: comma inside string
    //                                                               The variable `error` is never interpolated
    // No throw — caller receives `undefined` thinking the action succeeded
}
```

Two compounding bugs here:

1. **Malformed template literal** — The closing `)` is inside the string quote, so `error` is never interpolated. Logs say literally `, error)` instead of the actual error message.
2. **No rethrow** — When the database operation fails (network error, constraint violation, unexpected input), the action returns `undefined`. The client UI has no way to distinguish success from failure, leading to confusing UX (no feedback to the user) and invisible data integrity issues.

#### The Fix

```typescript
// modules/dashboard/actions/index.ts — FIXED error handling pattern
// Apply this pattern uniformly across deletePlaygroundById, editPlaygroundById,
// duplicatePlaygroundById, and createPlayground

} catch (error) {
    // Fixed: proper template literal with backticks and correct interpolation
    console.error(`Error deleting playground with id ${playgroundId}:`, error)
    //                                                                 ^ comma outside string
    //                                                                 ^ error is now interpolated
    
    // Re-throw so callers can handle the failure appropriately
    // Use structured errors so the UI can display meaningful messages
    throw new Error(`Failed to delete playground: ${(error as Error).message}`)
}
```

#### Standardized Error Helper (Optional but Recommended)

```typescript
// lib/errors.ts — centralized error handling
export class AppError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly statusCode: number = 500,
    ) {
        super(message)
        this.name = 'AppError'
    }
}

export function handleServerActionError(context: string, error: unknown): never {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[ServerAction] ${context}:`, error)
    throw new AppError(`${context} failed: ${message}`, 'SERVER_ACTION_ERROR')
}
```

```typescript
// Usage in server actions
} catch (error) {
    handleServerActionError(`Delete playground ${playgroundId}`, error)
}
```

---

## Additional Security Gaps

### No Route-Level Test Coverage

No test files were detected in the repository. The entire security model relies on untested code paths. Any future refactoring of the Prisma `where` clauses could silently reintroduce IDOR vulnerabilities without a failing test to catch it.

**Recommended minimal test suite for security-critical paths:**

```typescript
// __tests__/api/playground-idor.test.ts
describe('Playground API — IDOR protection', () => {
    it('should return 401 for unauthenticated GET request', async () => { ... })
    it('should return 404 when fetching another user\'s playground', async () => { ... })
    it('should return 200 when fetching own playground', async () => { ... })
})

describe('Dashboard Actions — Ownership enforcement', () => {
    it('deletePlaygroundById: should throw when targeting another user\'s playground', async () => { ... })
    it('duplicatePlaygroundById: should throw when duplicating another user\'s playground', async () => { ... })
})
```

### Middleware vs. Route-Level Auth

The current architecture gates unauthenticated access at the middleware level. **This does not protect against cross-user IDOR among authenticated users.** Middleware only checks "is this user logged in?" — it cannot check "does this user own this specific resource?" because it has no access to the database. Route-level ownership checks (as implemented in the fixes above) are always required and cannot be delegated to middleware.

---

## Implementation Priority Order

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| 1 | Add `userId` to `where` clause in playground GET API | 5 min | Blocks cross-user data exposure |
| 2 | Add ownership check to template GET and PUT API | 10 min | Blocks source code theft and overwriting |
| 3 | Add `userId` to `where` clause in delete and edit server actions | 10 min | Blocks cross-user mutation |
| 4 | Add ownership check to duplicate server action | 5 min | Blocks IP cloning |
| 5 | Remove `allowDangerousEmailAccountLinking` | 2 min | Blocks account takeover |
| 6 | Externalize Ollama endpoint to environment variable | 15 min | Fixes deployment and prevents SSRF |
| 7 | Fix malformed log strings and add re-throws | 15 min | Fixes silent failures |
| 8 | Add `overrides` for dompurify in package.json | 5 min | Patches XSS surface |
| 9 | Add security-focused integration tests | 2–4 hrs | Prevents regression |

---

## Summary of All Code Changes Required

| File | Change Type | Description |
|------|------------|-------------|
| `app/api/playground/[id]/route.ts` | Auth + where clause | Add `auth()` call; add `userId: session.user.id` to `findUnique` where |
| `app/api/template/[id]/route.ts` | Auth + where clause | Add `auth()` call; add ownership check before GET and PUT operations |
| `modules/dashboard/actions/index.ts` | Where clause | Add `userId: user.id` to delete, update, findUnique in delete/edit/duplicate actions |
| `auth.config.ts` | Config flag removal | Remove `allowDangerousEmailAccountLinking: true` from both providers |
| `app/api/ai-chat/route.ts` | Env externalization | Replace hardcoded `http://localhost:11434` with `getOllamaBaseUrl()` |
| `app/api/code-completion/route.ts` | Env externalization | Same as above for any hardcoded Ollama endpoint |
| `lib/ai-config.ts` | New file | Centralized Ollama URL resolver with scheme allowlist and validation |
| `modules/dashboard/actions/index.ts` | Error handling | Fix malformed template literals; add `throw` in all catch blocks |
| `package.json` | Dependency override | Add `overrides.dompurify` to pin to patched version |

