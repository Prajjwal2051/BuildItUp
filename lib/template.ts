import path from 'node:path'

// This file centralizes starter template locations so server actions can load them reliably.
export const templatePaths = {
    REACT: 'OrbitCode-starters/react',
    VUE: 'OrbitCode-starters/vue',
    ANGULAR: 'OrbitCode-starters/angular',
    NEXTJS: 'OrbitCode-starters/nextjs',
    EXPRESS: 'OrbitCode-starters/express',
    HONO: 'OrbitCode-starters/hono',
} as const

export type TemplateId = keyof typeof templatePaths

// Resolves an absolute path from the workspace root so callers do not depend on import location.
export const getTemplateAbsolutePath = (template: TemplateId) => {
    return path.resolve(process.cwd(), templatePaths[template])
}
