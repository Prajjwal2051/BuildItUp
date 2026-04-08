# 🏗️ BuildItUp

> **A browser-based collaborative coding playground** — spin up instant full-stack development environments, edit code with Monaco, preview your app live, run terminal commands, and get AI-powered inline suggestions, all inside a Next.js 16 app.

---

## ✨ Features

- **Instant Playgrounds** — Create sandboxed coding environments from templates (React, Next.js, Express, Vue, Hono, Angular) in one click.
- **Monaco Editor** — VS Code-grade editing with syntax highlighting, multi-tab support, split-pane view, and configurable font/theme settings.
- **Live Preview** — Powered by WebContainers API; your code runs in the browser with a real Node.js-like runtime, no server required.
- **Integrated Terminal** — Execute commands directly inside the WebContainer with streaming output, copy-logs, and resizable pane.
- **AI Inline Autocomplete** — Ghost-text completions appear at your cursor via a Monaco `InlineCompletionsProvider`; toggle on/off per-session.
- **AI Chat Sidebar** — Context-aware chat panel with the current file loaded; insert AI-generated code at the cursor with one click.
- **File Explorer** — Full tree-based explorer with add/rename/delete for files and folders; drag-to-resize sidebar.
- **Star Marks** — Bookmark favourite playgrounds for quick access from the dashboard.
- **OAuth Authentication** — Sign in with any OAuth provider (e.g. GitHub, Google) via NextAuth v5 with JWT sessions.
- **Role-based Access** — Three user roles: `USER`, `ADMIN`, `PREMIUM_USER` enforced at the session level.
- **Persistent Preferences** — Editor theme, font size, font family, split-editor state, and sidebar width are persisted to `localStorage`.
- **Keyboard Shortcuts** — `Ctrl+S` / `Ctrl+Shift+S` to save / save all; `Ctrl+P` to open file search.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4, shadcn/ui, Radix UI |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| In-browser Runtime | WebContainers API (`@webcontainer/api`) |
| Database | MongoDB via [Prisma 6](https://www.prisma.io) + Prisma Accelerate |
| Auth | [NextAuth v5](https://authjs.dev) (JWT strategy, `@auth/prisma-adapter`) |
| State Management | [Zustand](https://zustand-demo.pmnd.rs) |
| Charts | Recharts |
| Notifications | Sonner |
| Code Formatting | Prettier |
| Linting | ESLint 9 |

---

## 📁 Project Structure

```
BuildItUp/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # Auth routes (sign-in, sign-up)
│   ├── (root)/                   # Public-facing landing page
│   ├── dashboard/                # User dashboard (lists playgrounds)
│   ├── playground/[id]/          # Full playground workspace
│   │   └── page.tsx              # Main IDE shell (~79 KB, all editor logic)
│   ├── api/                      # Next.js API routes
│   ├── layout.tsx                # Root layout (fonts, themes, providers)
│   └── globals.css               # Global Tailwind styles
│
├── modules/                      # Feature-based module boundaries
│   ├── auth/                     # Auth actions (getUserById, getUserByEmail)
│   ├── dashboard/                # Dashboard data fetching & components
│   ├── home/                     # Landing page components
│   ├── playground/
│   │   ├── actions/              # Server actions (create/save/load playgrounds)
│   │   ├── components/           # Explorer, terminal, AI sidebar, toggle-AI
│   │   ├── hooks/                # usePlayground, useFileExplorer (Zustand), useAISuggestion
│   │   └── lib/                  # path-to-json, editor-config, language mappings
│   └── webContainers/
│       ├── components/           # WebContainerPreview component
│       └── hooks/                # useWebContainer (boot, write, destroy)
│
├── components/                   # Shared shadcn/ui + custom components
├── hooks/                        # Global custom React hooks
├── lib/                          # Utility helpers (db, utils, etc.)
├── prisma/
│   └── schema.prisma             # MongoDB data models
├── OrbitCode-starters/           # Starter templates for each framework
├── Docs/                         # Project documentation assets
├── auth.ts                       # NextAuth configuration & callbacks
├── auth.config.ts                # Provider + pages config
├── proxy.ts                      # Dev proxy helper
├── route.ts                      # Shared route constants
├── next.config.ts                # Next.js config (headers, images, etc.)
├── prisma.config.ts              # Prisma client singleton
└── tsconfig.json                 # TypeScript path aliases
```

---

## 🗄️ Data Models

```prisma
User           — id, name, email, image, role (USER | ADMIN | PREMIUM_USER)
Account        — OAuth provider link (supports multi-provider per user)
Playground     — title, description, code, template (REACT | NEXTJS | EXPRESS | VUE | HONO | ANGULAR)
TemplateFile   — JSON file-tree content stored per playground (1-to-1)
StarMark       — userId ↔ playgroundId bookmark (unique constraint)
```

All models use MongoDB with Prisma's `@db.String` for large text fields.

---

## ⚙️ Environment Variables

Create a `.env.local` file at the project root:

```env
# Database
DATABASE_URL="mongodb+srv://<user>:<password>@cluster.mongodb.net/builditup"

# NextAuth
AUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers (add whichever you use)
AUTH_GITHUB_ID="your-github-app-id"
AUTH_GITHUB_SECRET="your-github-app-secret"

AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# Prisma Accelerate (optional, for edge/serverless)
PRISMA_ACCELERATE_URL="prisma://accelerate.prisma-data.net/?api_key=..."
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- A MongoDB Atlas cluster (free tier works fine)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Prajjwal2051/BuildItUp.git
cd BuildItUp

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# → Fill in DATABASE_URL, AUTH_SECRET, OAuth credentials

# 4. Push the Prisma schema to MongoDB
npx prisma db push

# 5. (Optional) Open Prisma Studio to inspect your DB
npx prisma studio

# 6. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server with hot reload |
| `npm run build` | Build production bundle |
| `npm start` | Serve production build |
| `npm run lint` | Run ESLint across the codebase |

---

## 🧭 Key Workflows

### Creating a Playground
1. Sign in via OAuth.
2. From the **Dashboard**, click **New Playground**.
3. Choose a framework template (React, Next.js, Express, Vue, Hono, or Angular).
4. The editor opens with the starter file tree pre-loaded.

### Working in the Editor
- **File Explorer** — Left panel; click to open, right-click to add/rename/delete.
- **Tabs** — An orange dot indicates unsaved changes; click ✕ to close a tab.
- **Save** — `Ctrl+S` saves the active file; `Ctrl+Shift+S` saves all dirty tabs.
- **Split View** — Click **Split** in the toolbar to open a secondary editor pane; use the swap (⇄) button to exchange panes.
- **Search** — `Ctrl+P` opens the fuzzy file search dialog.
- **Preview** — Toggle **Preview** in the top-right to show/hide the live WebContainer preview.
- **Terminal** — Click the terminal icon to open a resizable terminal panel; type commands and stream output.
- **AI** — Click **Trigger AI** in the editor header for ghost-text inline completions, or open the **AI Chat** sidebar to ask questions about the current file.

### Editor Settings
Click the ⚙ icon in the toolbar to adjust:
- Theme: **Dark** or **Light**
- Font size: 11 – 28 px (slider)
- Font family: JetBrains Mono, Fira Code, Source Code Pro, Menlo

---

## 🔐 Authentication Flow

BuildItUp uses **NextAuth v5** with a **JWT session strategy**. On first sign-in:

1. NextAuth calls the `signIn` callback with the OAuth `user` and `account`.
2. The callback checks for an existing `Account` record (by `provider + providerAccountId`).
3. If found → OAuth tokens are refreshed; sign-in proceeds.
4. If not found → checks for a `User` with the same email; creates one if absent, then creates and links the `Account`.
5. The `jwt` callback enriches the token with `id`, `name`, `email`, and `role` from MongoDB.
6. The `session` callback forwards these fields to the client so `session.user.role` is always available.

---

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/your-feature`.
3. Commit your changes: `git commit -m "feat: describe your change"`.
4. Push to your fork: `git push origin feat/your-feature`.
5. Open a Pull Request against `main`.

Please follow the existing code style (Prettier config is included) and ensure `npm run lint` passes before submitting.

---

## 📄 License

This project is private. All rights reserved © Prajjwal2051.
