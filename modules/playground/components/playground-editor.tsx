'use client'
// This component is responsible for rendering the Monaco Editor and handling its interactions.
import { useRef, useCallback, useEffect, type ComponentProps } from 'react'
import Editor, { type Monaco } from '@monaco-editor/react'
import { configureMonaco, defaultEditorOptions, getEditorLanguage } from '../lib/editor-config'
import type { FileTreeNode } from '@/modules/playground/lib/path-to-json'

// The PlaygroundEditor component renders the Monaco Editor and manages its state based on the active file and its content.
interface playgroundEditorProps {
    activeFile: FileTreeNode | undefined
    content: string
    onContentChange: (newContent: string) => void
}

type MonacoEditorInstance = Parameters<
    NonNullable<ComponentProps<typeof Editor>['onMount']>
>[0]

// The component uses refs to keep track of the editor instance and the Monaco instance for dynamic configuration and language updates.
const PlaygroundEditor = ({ activeFile, content, onContentChange }: playgroundEditorProps) => {
    const editorRef = useRef<MonacoEditorInstance | null>(null)
    const monacoRef = useRef<Monaco | null>(null)

    // The updateEditorLanguage function updates the language mode of the editor based on the active file's extension. It uses the getEditorLanguage utility to determine the appropriate language for syntax highlighting and other editor features.
    const updateEditorLanguage = useCallback((file: FileTreeNode | undefined) => {
        if (editorRef.current && monacoRef.current) {
            const language = file ? getEditorLanguage(file.name) : 'plaintext'
            const model = editorRef.current.getModel()
            if (model) {
                monacoRef.current.editor.setModelLanguage(model, language)
            }
        }
    }, [])

    useEffect(() => {
        updateEditorLanguage(activeFile)
    }, [activeFile, updateEditorLanguage])

    return (
        <div className="h-full relative">
            <Editor
                height="100%"
                defaultLanguage={activeFile ? getEditorLanguage(activeFile.name) : 'plaintext'}
                value={content}
                onChange={(value) => onContentChange(value || '')}
                beforeMount={(monaco) => {
                    monacoRef.current = monaco
                    configureMonaco(monaco)
                }}
                onMount={(editor, monaco) => {
                    editorRef.current = editor
                    monacoRef.current = monaco
                    configureMonaco(monaco)
                    updateEditorLanguage(activeFile)
                }}
                options={{
                    ...defaultEditorOptions,
                    readOnly: !activeFile, // Make editor read-only if no file is active
                } as unknown as ComponentProps<typeof Editor>['options']}
            />
            {!activeFile && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
                    <p className="text-gray-500 text-lg">Select a file to view its content</p>
                </div>
            )}
        </div>
    )
}

export default PlaygroundEditor
