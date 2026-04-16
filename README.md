<div align="center">

<h1>
  Orbit Code
</h1>

<p><strong>A browser-based, full-stack coding playground.</strong><br/>
Spin up instant dev environments, edit with Monaco, preview live via WebContainers,<br/>run terminal commands, and get AI-powered completions — all in your browser.</p>

<p>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://www.prisma.io"><img src="https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma" /></a>
  <a href="https://authjs.dev"><img src="https://img.shields.io/badge/NextAuth-v5-purple?style=flat-square" alt="NextAuth" /></a>
  <img src="https://img.shields.io/badge/license-Private-red?style=flat-square" alt="License" />
</p>

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Data Models](#data-models)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Key Workflows](#key-workflows)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Authentication Flow](#authentication-flow)
- [WebContainers & COEP Headers](#webcontainers--coep-headers)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**Orbit Code** is a full-featured, browser-based IDE and coding playground inspired by tools like StackBlitz and CodeSandbox. Users sign in via OAuth, create playgrounds from framework starter templates, and get a complete development experience — file explorer, Monaco code editor, live WebContainer preview, integrated terminal, split-pane editing, and an AI assistant — all without leaving the browser tab.

---

## Features

### 🖥️ Editor

- **Monaco Editor** (same engine as VS Code) with syntax highlighting for all major languages
- **Multi-tab editing** with unsaved-change indicators (orange dot per dirty tab)
- **Split-pane view** — open two files side by side with a swap button
- **Fuzzy file search** (`Ctrl+P`) to jump to any file in the tree instantly
- **Configurable preferences** — theme (Dark/Light), font size (11–28 px), font family (JetBrains Mono, Fira Code, Source Code Pro, Menlo)
- Preferences and split state are **persisted to `localStorage`** across sessions

### ⚡ Live Preview & Terminal

- **WebContainers API** boots a real Node.js-like runtime in the browser — no backend server needed
- **Hot file sync** — edits are debounced and written to the WebContainer within 150 ms
- **Integrated terminal** with streaming command output, copy-logs button, and drag-to-resize pane
- `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers configured for SharedArrayBuffer support

### 🤖 AI Assistant

- **Inline ghost-text completions** via Monaco's `InlineCompletionsProvider` — suggestions appear at the cursor as you type
- **AI Chat Sidebar** — context-aware conversation with the current file pre-loaded; insert generated code directly at the cursor
- Per-session toggle to enable or disable all AI features

### 📁 File Explorer

- Full **tree-based explorer** with collapsible directories
- **Create, rename, and delete** files and folders from the sidebar
- Drag-to-resize sidebar panel (220–520 px width range, persisted)

### 🔒 Auth & Users

- **OAuth sign-in** (GitHub, Google, and any NextAuth-compatible provider)
- **JWT session strategy** — no database session table needed
- **Role-based access**: `USER`, `ADMIN`, `PREMIUM_USER`
- Multi-provider account linking — the same email can sign in via different providers

### ⭐ Dashboard

- Create and manage multiple playgrounds per user
- **Star/bookmark** favourite playgrounds for quick access
- Choose from six framework templates: **React, Next.js, Express, Vue, Hono, Angular**

---

## Tech Stack

| Category      | Technology mn ,                                                        | Purpose                                  |
| ------------- | ---------------------------------------------------------------------- | ---------------------------------------- |
| Framework     | [Next.js 16](https://nextjs.org) (App Router)                          | SSR, routing, API routes, server actions |
| Language      | TypeScript 5                                                           | Type safety across the full stack        |
| Styling       | Tailwind CSS v4, [shadcn/ui](https://ui.shadcn.com), Radix UI          | UI components and design system          |
| Editor        | [`@monaco-editor/react`](https://github.com/suren-atoyan/monaco-react) | VS Code-grade in-browser editor          |
| Runtime       | [`@webcontainer/api`](https://webcontainers.io)                        | In-browser Node.js environment           |
| Database      | MongoDB + [Prisma 6](https://www.prisma.io) + Prisma Accelerate        | ORM, data models, edge caching           |
| Auth          | [NextAuth v5](https://authjs.dev) + `@auth/prisma-adapter`             | OAuth, JWT sessions, callbacks           |
| State         | [Zustand](https://zustand-demo.pmnd.rs)                                | File explorer & playground client state  |
| Charts        | [Recharts](https://recharts.org)                                       | Dashboard analytics                      |
| Notifications | [Sonner](https://sonner.emilkowal.ski)                                 | Toast notifications                      |
| Formatting    | Prettier                                                               | Consistent code style                    |
| Linting       | ESLint 9                                                               | Static analysis                          |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                     │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐     │
│  │ Monaco Editor│  │  File Tree   │  │  AI Sidebar    │     │
│  │  (primary +  │  │  (Zustand    │  │  (chat +       │     │
│  │   split pane)│  │   store)     │  │   inline AI)   │     │
│  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘     │
│         │                 │                  │              │
│  ┌──────▼─────────────────▼──────────────────▼──────────┐   │
│  │                  Playground Page Shell               │   │
│  │           (app/playground/[id]/page.tsx)             │   │
│  └──────────────────────────┬───────────────────────────┘   │
│                             │                               │
│  ┌──────────────────────────▼────────────────────────────┐  │
│  │              WebContainer (in-browser Node.js)        │  │
│  │     live preview  │  terminal  │  file write sync     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                             │
                  Next.js Server Actions
                             │
         ┌───────────────────▼──────────────────┐
         │         Prisma ORM (MongoDB)         │
         │  User · Account · Playground ·       │
         │  TemplateFile · StarMark             │
         └──────────────────────────────────────┘
```

---

## Project Structure

```
OrbitCode/
├── app/                            # Next.js App Router
│   ├── (auth)/                     # Sign-in / sign-up pages
│   ├── (root)/                     # Public landing page
│   ├── dashboard/                  # User dashboard
│   ├── playground/
│   │   └── [id]/
│   │       ├── layout.tsx          # Minimal layout wrapper
│   │       └── page.tsx            # Full IDE shell (Monaco + WebContainer + AI)
│   ├── api/                        # Next.js API routes
│   ├── layout.tsx                  # Root layout (fonts, theme provider)
│   └── globals.css                 # Global Tailwind styles
│
├── modules/                        # Feature-scoped modules
│   ├── auth/
│   │   └── actions/                # getUserById, getUserByEmail
│   ├── dashboard/
│   │   ├── actions/                # Server actions for playground CRUD
│   │   └── components/             # Dashboard UI components
│   ├── home/
│   │   └── components/             # Landing page sections
│   ├── playground/
│   │   ├── actions/                # saveTemplateData, loadPlayground
│   │   ├── components/
│   │   │   ├── playground-explorer.tsx    # File tree UI
│   │   │   ├── playground-editor.tsx      # Editor wrapper
│   │   │   ├── playground-terminal.tsx    # Terminal panel
│   │   │   ├── playground-ai-sidebar.tsx  # AI chat panel
│   │   │   ├── toggle-ai.tsx              # AI enable/disable toggle
│   │   │   └── dialogs/                   # Create/rename dialogs
│   │   ├── hooks/
│   │   │   ├── usePlayground.ts           # Data fetching for playground
│   │   │   ├── useFileExplorer.ts         # Zustand store (file tree + open tabs)
│   │   │   └── useAISuggestion.ts         # Inline AI completion hook
│   │   └── lib/
│   │       ├── path-to-json.ts            # File tree ↔ JSON conversion
│   │       └── editor-config.ts           # Monaco theme, language map, options
│   └── webContainers/
│       ├── components/
│       │   └── webContainerPreview.tsx    # Live preview iframe
│       └── hooks/
│           └── useWebContainer.ts         # Boot, file write, destroy lifecycle
│
├── components/                     # Shared shadcn/ui + custom components
├── hooks/                          # App-wide custom hooks
├── lib/
│   ├── db.ts                       # Prisma client singleton
│   └── utils.ts                    # cn(), misc helpers
├── prisma/
│   └── schema.prisma               # MongoDB models
├── OrbitCode-starters/             # Per-framework starter file trees
├── Docs/                           # Documentation assets
├── auth.ts                         # NextAuth config + signIn/jwt/session callbacks
├── auth.config.ts                  # OAuth providers + custom pages
├── next.config.ts                  # COEP/COOP headers for WebContainers
├── prisma.config.ts                # Prisma client config
├── proxy.ts                        # Dev reverse proxy
├── route.ts                        # Centralised route path constants
└── tsconfig.json                   # Path aliases (@/...)
```

---

## Data Models

```prisma
// Users and OAuth accounts
model User {
  id        String     @id @default(cuid())
  name      String
  email     String     @unique
  image     String?
  role      UserRole   @default(USER)   // USER | ADMIN | PREMIUM_USER
  accounts  Account[]
  playgrounds Playground[]
  starMarks   StarMark[]
}

model Account {
  // One per OAuth provider per user (GitHub, Google, etc.)
  provider          String
  providerAccountId String
  // ...OAuth token fields
  @@unique([provider, providerAccountId])
}

// Playground = a named coding project
model Playground {
  id          String    @id @default(cuid())
  title       String
  description String
  template    Templates  // REACT | NEXTJS | EXPRESS | VUE | HONO | ANGULAR
  templateFile TemplateFile?  // 1-to-1 JSON file tree
  starMarks   StarMark[]
}

// Stores the full file tree as JSON (1-to-1 with Playground)
model TemplateFile {
  content      Json
  playgroundId String @unique
}

// Bookmark: a user ↔ playground star
model StarMark {
  userId       String
  playgroundId String
  isMarked     Boolean @default(false)
  @@unique([userId, playgroundId])
}
```

---

## Environment Variables

Create a `.env.local` file at the project root:

```env
# ── Database ─────────────────────────────────────────────────
DATABASE_URL="mongodb+srv://<user>:<password>@cluster.mongodb.net/orbitcode"

# ── NextAuth ─────────────────────────────────────────────────
AUTH_SECRET="a-long-random-secret"          # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# ── OAuth Providers (add the ones you need) ──────────────────
AUTH_GITHUB_ID="your-github-oauth-app-id"
AUTH_GITHUB_SECRET="your-github-oauth-app-secret"

AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# ── Prisma Accelerate (optional — for edge/serverless) ───────
PRISMA_ACCELERATE_URL="prisma://accelerate.prisma-data.net/?api_key=..."
```

> **Tip:** Generate `AUTH_SECRET` with `openssl rand -base64 32` or use `npx auth secret`.

---

## Getting Started

### Prerequisites

| Requirement | Version                         |
| ----------- | ------------------------------- |
| Node.js     | ≥ 20                            |
| npm         | ≥ 10                            |
| MongoDB     | Atlas cluster (free tier works) |

### Installation

```bash
# 1. Clone
git clone https://github.com/Prajjwal2051/OrbitCode.git
cd OrbitCode

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local and fill in all required values

# 4. Push schema to MongoDB
npx prisma db push

# 5. (Optional) Inspect the database
npx prisma studio

# 6. Start development server
npm run dev
```

Visit **[http://localhost:3000](http://localhost:3000)** to open the app.

---

## Available Scripts

| Script           | Command              | Description                         |
| ---------------- | -------------------- | ----------------------------------- |
| Dev server       | `npm run dev`        | Start Next.js with hot reload       |
| Production build | `npm run build`      | Compile and optimise for production |
| Production start | `npm start`          | Serve the production build          |
| Lint             | `npm run lint`       | Run ESLint across the codebase      |
| DB push          | `npx prisma db push` | Sync schema to MongoDB              |
| DB studio        | `npx prisma studio`  | Open Prisma's visual DB browser     |

---

## Key Workflows

### Creating a Playground

1. Sign in with GitHub or Google.
2. On the **Dashboard**, click **New Playground**.
3. Pick a template — **React**, **Next.js**, **Express**, **Vue**, **Hono**, or **Angular**.
4. The workspace opens with the full starter file tree pre-loaded.

### Working in the IDE

| Area               | How to use                                                                          |
| ------------------ | ----------------------------------------------------------------------------------- |
| **File Explorer**  | Click a file to open it; use the `+` icon or right-click to add/rename/delete       |
| **Tabs**           | Orange dot = unsaved changes; click `×` to close                                    |
| **Save**           | `Ctrl+S` — active file; `Ctrl+Shift+S` — all dirty files                            |
| **Split View**     | Click **Split** in the bottom toolbar; use ⇄ to swap panes                          |
| **File Search**    | `Ctrl+P` — fuzzy search by name or path                                             |
| **Live Preview**   | Click **Preview** (top-right) to toggle the WebContainer iframe                     |
| **Terminal**       | Click the terminal icon; drag the handle to resize; **Copy Logs** copies all output |
| **AI Completions** | Click **Trigger AI** for ghost-text at cursor; Tab to accept                        |
| **AI Chat**        | Open the sidebar via **AI Chat**; generated code inserts at cursor                  |
| **Settings**       | Click ⚙ to change theme, font size, or font family                                  |
| **Fullscreen**     | Click the ⛶ icon in the top-right toolbar                                           |

---

## Keyboard Shortcuts

| Shortcut       | Action                  |
| -------------- | ----------------------- |
| `Ctrl+S`       | Save active file        |
| `Ctrl+Shift+S` | Save all unsaved files  |
| `Ctrl+P`       | Open file search dialog |

---

## Authentication Flow

OrbitCode uses **NextAuth v5** with a **JWT session strategy** (no `Session` table in the DB).

```
User clicks "Sign In"
        │
        ▼
  OAuth Provider (GitHub / Google)
        │
        ▼
  signIn() callback
   ├─ Account exists?  → refresh tokens  → ✅ allow
   ├─ Email exists?    → link account     → ✅ allow
   └─ New user?        → create User + Account → ✅ allow
        │
        ▼
  jwt() callback  →  attach id, name, email, role to token
        │
        ▼
  session() callback  →  expose token fields to client
        │
        ▼
  Redirect → /dashboard
```

Multiple OAuth providers can be linked to the same user account (matched by email).

---

## WebContainers & COEP Headers

WebContainers require `SharedArrayBuffer`, which is only available in [cross-origin isolated](https://developer.chrome.com/blog/enabling-shared-array-buffer/) contexts. OrbitCode sets the required HTTP headers globally in `next.config.ts`:

```ts
// next.config.ts
headers: [
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
]
```

> ⚠️ These headers affect how third-party iframes and resources load. Keep this in mind when embedding external content.

---

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository.
2. **Create a branch**: `git checkout -b feat/your-feature-name`
3. **Make your changes** and ensure the code style is consistent:
    ```bash
    npm run lint
    ```
4. **Commit** using [Conventional Commits](https://www.conventionalcommits.org):
    ```
    feat: add dark mode toggle
    fix: resolve terminal scroll overflow
    docs: update environment variables section
    ```
5. **Push** and open a **Pull Request** against `main`.

> The Prettier config (`.prettierrc`) is included — run your editor's format-on-save or `npx prettier --write .` before committing.

---

## License

This project is **private**. All rights reserved © 2026 [Prajjwal2051](https://github.com/Prajjwal2051).

---

<div align="center">
  <sub>Built with ❤️ using Next.js, Monaco Editor, and WebContainers</sub>
</div>
