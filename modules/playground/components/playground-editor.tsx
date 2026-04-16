'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react'
import type { editor as MonacoEditor } from 'monaco-editor'
import { SidebarInset } from '@/components/ui/sidebar'
import { FileCode2 } from 'lucide-react'
import Link from 'next/link'
import { configureMonaco, defaultEditorOptions } from '@/modules/playground/lib/editor-config'
import { useCollaboration } from '@/hooks/use-collaboration'
import type { ServerMessage, TextOperations } from '@/CollabServer/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { diff_match_patch, DIFF_DELETE, DIFF_EQUAL, DIFF_INSERT } from 'diff-match-patch'
import { PresenceAvatars } from '@/modules/playground/components/presence-avatars'

type CollaborationConflict = Extract<ServerMessage, { type: 'conflict' }>

interface PlaygroundEditorProps {
    playgroundId: string
    collab?: { token: string }
}

export function PlaygroundEditor({ playgroundId, collab }: PlaygroundEditorProps) {
    const [editor, setEditor] = useState<MonacoEditor.IStandaloneCodeEditor | null>(null)
    const [initialValue, setInitialValue] = useState('// Connecting collaborative session...')
    const [activeConflict, setActiveConflict] = useState<CollaborationConflict | null>(null)

    const monacoRef = useRef<Monaco | null>(null)
    const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
    const decorationsRef = useRef<MonacoEditor.IEditorDecorationsCollection | null>(null)
    const isApplyingRemoteEditRef = useRef(false)

    const toClassSafeId = useCallback((userId: string) => userId.replace(/[^a-zA-Z0-9_-]/g, '_'), [])

    const applyRemoteOperation = useCallback((op: TextOperations) => {
        const currentEditor = editorRef.current
        const monaco = monacoRef.current
        const model = currentEditor?.getModel()
        if (!currentEditor || !monaco || !model) return

        const startPos = model.getPositionAt(op.position)
        if (!startPos) return

        isApplyingRemoteEditRef.current = true
        try {
            if (op.type === 'insert') {
                currentEditor.executeEdits('collab-remote', [{
                    range: new monaco.Range(startPos.lineNumber, startPos.column, startPos.lineNumber, startPos.column),
                    text: op.text,
                }])
            }
            if (op.type === 'delete') {
                const endPos = model.getPositionAt(op.position + op.length)
                currentEditor.executeEdits('collab-remote', [{
                    range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
                    text: '',
                }])
            }
        } finally {
            isApplyingRemoteEditRef.current = false
        }
    }, [])

    const handleServerInit = useCallback((content: string) => {
        const currentEditor = editorRef.current
        const model = currentEditor?.getModel()
        if (!currentEditor || !model) {
            setInitialValue(content)
            return
        }
        if (model.getValue() === content) return
        isApplyingRemoteEditRef.current = true
        try { model.setValue(content) }
        finally { isApplyingRemoteEditRef.current = false }
    }, [])

    const { users, isConnected, sendOp, sendCursor, localUserId } = useCollaboration({
        token: collab?.token ?? '',
        editor,
        enabled: Boolean(collab?.token),
        onServerOperation: (op) => applyRemoteOperation(op),
        onServerInit: (content) => handleServerInit(content),
    })

    useEffect(() => {
        const handleOpenConflict = (event: Event) => {
            const customEvent = event as CustomEvent<CollaborationConflict>
            setActiveConflict(customEvent.detail)
        }
        window.addEventListener('collab-conflict-open', handleOpenConflict)
        return () => window.removeEventListener('collab-conflict-open', handleOpenConflict)
    }, [])

    const conflictSides = useMemo(() => {
        if (!activeConflict) return null
        const isMineA = localUserId ? activeConflict.authorAId === localUserId : true
        const mineName = isMineA ? 'You' : (users.find((u) => u.userId === activeConflict.authorAId)?.displayName ?? activeConflict.authorAId)
        const theirsName = isMineA ? (users.find((u) => u.userId === activeConflict.authorBId)?.displayName ?? activeConflict.authorBId) : 'You'
        const mineText = isMineA ? activeConflict.contentA : activeConflict.contentB
        const theirsText = isMineA ? activeConflict.contentB : activeConflict.contentA
        const dmp = new diff_match_patch()
        const diffs = dmp.diff_main(mineText, theirsText)
        dmp.diff_cleanupSemantic(diffs)
        const mergedText = mineText.includes(theirsText) ? mineText : theirsText.includes(mineText) ? theirsText : `${mineText}\n${theirsText}`
        return { mineName, theirsName, mineText, theirsText, diffs, mergedText }
    }, [activeConflict, localUserId, users])

    const renderDiffText = useCallback((side: 'mine' | 'theirs') => {
        if (!conflictSides) return null
        return conflictSides.diffs.map(([kind, text], index) => {
            if (kind === DIFF_EQUAL) return <span key={`${side}-${index}`}>{text}</span>
            if (side === 'mine' && kind === DIFF_DELETE)
                return <span key={`${side}-${index}`} className="rounded bg-red-500/15 text-red-200 line-through">{text}</span>
            if (side === 'theirs' && kind === DIFF_INSERT)
                return <span key={`${side}-${index}`} className="rounded bg-emerald-500/15 text-emerald-200">{text}</span>
            return null
        })
    }, [conflictSides])

    const applyEditorValue = useCallback((nextValue: string) => {
        const currentEditor = editorRef.current
        const model = currentEditor?.getModel()
        if (!currentEditor || !model) return
        isApplyingRemoteEditRef.current = true
        try { model.setValue(nextValue) }
        finally { isApplyingRemoteEditRef.current = false }
    }, [])

    const cursorCss = useMemo(() => {
        return users.map((user) => {
            const classId = toClassSafeId(user.userId)
            return `
.remote-cursor-${classId} { border-left: 2px solid ${user.color}; background: ${user.color}33; }
`
        }).join('\n')
    }, [toClassSafeId, users])

    const handleKeepMine = useCallback(() => setActiveConflict(null), [])
    const handleKeepTheirs = useCallback(() => {
        if (!conflictSides) return
        applyEditorValue(conflictSides.theirsText)
        setActiveConflict(null)
    }, [applyEditorValue, conflictSides])
    const handleMerge = useCallback(() => {
        if (!conflictSides) return
        applyEditorValue(conflictSides.mergedText)
        setActiveConflict(null)
    }, [applyEditorValue, conflictSides])

    useEffect(() => {
        const currentEditor = editorRef.current
        const monaco = monacoRef.current
        const decorations = decorationsRef.current
        if (!currentEditor || !monaco || !decorations) return
        decorations.set(
            users.flatMap((user) => {
                if (!user.cursor) return []
                const classId = toClassSafeId(user.userId)
                return [{
                    range: new monaco.Range(
                        user.cursor.startLine, user.cursor.startCol,
                        user.cursor.endLine, user.cursor.endColumn,
                    ),
                    options: { className: `remote-cursor-${classId}` },
                }]
            }),
        )
    }, [toClassSafeId, users])

    const handleEditorMount: OnMount = useCallback((mountedEditor, monaco) => {
        monacoRef.current = monaco
        editorRef.current = mountedEditor
        setEditor(mountedEditor)
        decorationsRef.current = mountedEditor.createDecorationsCollection([])
        configureMonaco(monaco)
        const model = mountedEditor.getModel()
        if (!model) return
        mountedEditor.onDidChangeModelContent((event) => {
            if (isApplyingRemoteEditRef.current) return
            for (const change of event.changes) {
                const startOffset = model.getOffsetAt(change.range.getStartPosition())
                if (change.rangeLength > 0) sendOp({ type: 'delete', position: startOffset, length: change.rangeLength })
                if (change.text.length > 0) sendOp({ type: 'insert', position: startOffset, text: change.text })
            }
        })
        mountedEditor.onDidChangeCursorSelection((e) => {
            const sel = e.selection
            sendCursor({
                startLine: sel.startLineNumber,
                startCol: sel.startColumn,
                endLine: sel.endLineNumber,
                endColumn: sel.endColumn,
            })
        })
    }, [sendOp, sendCursor])

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#0a0d12]">
            <style>{cursorCss}</style>
            <SidebarInset className="relative flex flex-1 flex-col overflow-hidden text-white">
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-[#1e2028] bg-[#080e13] px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center gap-2 rounded-xl border border-[#1e2028] bg-[#11161d] px-3 py-1.5">
                            <FileCode2 size={16} className="text-[#00d4aa]" />
                            <span className="font-mono text-[13px] font-medium text-[#c9d4e5]">
                                Collaborative Playground
                            </span>
                        </div>

                        {/* Collab connection badge */}
                        {collab && (
                            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs border ${
                                isConnected
                                    ? 'bg-[#00d4aa]/10 border-[#00d4aa]/20 text-[#00d4aa]'
                                    : 'bg-[#1e2028]/50 border-[#1e2028] text-[#8ea5b5]'
                            }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                    isConnected ? 'bg-[#00d4aa] animate-pulse' : 'bg-[#8ea5b5]'
                                }`} />
                                <span>{isConnected ? 'Live' : 'Connecting…'}</span>
                            </div>
                        )}

                        {/* Canva-style presence avatars */}
                        <PresenceAvatars users={users} localUserId={localUserId} maxVisible={4} />
                    </div>

                    <div>
                        <Link
                            href="/dashboard"
                            className="rounded-md border border-[#1e2028] bg-[#11161d] px-3 py-1.5 text-xs text-[#8ea5b5] transition-colors hover:border-[#00d4aa]/30 hover:text-white"
                        >
                            Go to Dashboard
                        </Link>
                    </div>
                </div>

                {/* Monaco editor */}
                <div className="flex-1 overflow-hidden">
                    <Editor
                        height="100%"
                        defaultLanguage="typescript"
                        defaultValue={initialValue}
                        theme="modern-dark"
                        onMount={handleEditorMount}
                        options={defaultEditorOptions}
                        path={`${playgroundId}.ts`}
                    />
                </div>
            </SidebarInset>

            {/* Conflict resolution dialog */}
            <Dialog open={Boolean(activeConflict)} onOpenChange={(open) => !open && setActiveConflict(null)}>
                <DialogContent className="max-h-[90vh] max-w-[92vw] overflow-hidden border-[#1e2028] bg-[#0b1016] text-white sm:max-w-300">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-white">
                            {conflictSides ? `You and ${conflictSides.theirsName} edited the same region` : 'Conflict detected'}
                        </DialogTitle>
                    </DialogHeader>

                    {conflictSides && (
                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <div className="rounded-xl border border-[#1e2028] bg-[#0f141a] p-4">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#8ea5b5]">{conflictSides.mineName}</div>
                                <ScrollArea className="h-[52vh] rounded-lg border border-[#1e2028] bg-[#080e13] p-4 font-mono text-sm leading-6 text-[#d7e2f1]">
                                    <div className="whitespace-pre-wrap wrap-break-word">{renderDiffText('mine')}</div>
                                </ScrollArea>
                            </div>
                            <div className="rounded-xl border border-[#1e2028] bg-[#0f141a] p-4">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#8ea5b5]">{conflictSides.theirsName}</div>
                                <ScrollArea className="h-[52vh] rounded-lg border border-[#1e2028] bg-[#080e13] p-4 font-mono text-sm leading-6 text-[#d7e2f1]">
                                    <div className="whitespace-pre-wrap wrap-break-word">{renderDiffText('theirs')}</div>
                                </ScrollArea>
                            </div>
                        </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                        <button type="button" onClick={handleKeepMine}
                            className="rounded-md border border-[#1e2028] bg-[#11161d] px-4 py-2 text-sm text-white transition-colors hover:border-[#00d4aa]/30">
                            Keep mine
                        </button>
                        <button type="button" onClick={handleKeepTheirs}
                            className="rounded-md border border-[#00d4aa]/30 bg-[#00d4aa]/10 px-4 py-2 text-sm text-[#00d4aa] transition-colors hover:bg-[#00d4aa]/15">
                            Keep theirs
                        </button>
                        <button type="button" onClick={handleMerge}
                            className="rounded-md border border-[#5cc8ff]/30 bg-[#5cc8ff]/10 px-4 py-2 text-sm text-[#5cc8ff] transition-colors hover:bg-[#5cc8ff]/15">
                            Merge
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
