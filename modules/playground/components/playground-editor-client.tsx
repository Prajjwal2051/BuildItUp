'use client'

import dynamic from 'next/dynamic'

export const PlaygroundEditorClient = dynamic(
    () => import('./playground-editor').then((m) => ({ default: m.PlaygroundEditor })),
    { ssr: false }
)