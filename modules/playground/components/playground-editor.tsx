"use client"
// This component is responsible for rendering the Monaco Editor and handling its interactions.
import { useRef, useCallback, useState, useEffect } from 'react'
import Editor, { type Monaco } from '@monaco-editor/react'
import { configureMonaco, defaultEditorOptions, getEditorLanguage } from '../lib/editor-config'
import type { FileTreeNode } from '@/modules/playground/lib/path-to-json'
import React from 'react'

// The PlaygroundEditor component renders the Monaco Editor and manages its state based on the active file and its content.
interface playgroundEditorProps {
  activeFile: FileTreeNode | undefined
  content: string
  onContentChange: (newContent: string) => void
}

// The component uses refs to keep track of the editor instance and the Monaco instance for dynamic configuration and language updates.
const PlaygroundEditor = ({ activeFile, content, onContentChange }: playgroundEditorProps) => {

  const editorRef = useRef<any>(null)
  const monacoRef = useRef<Monaco | null>(null)
  // The handleEditorDidMount function is called when the editor is mounted, allowing us to store references to the editor and Monaco instances for later use. It also applies the default editor options and configures Monaco with any additional settings needed for our playground.
  const handleEditorDidMount = useCallback((editor: any, monaco: Monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    console.log('Editor mounted:', editor)
    editor.updateOptions({
      ...defaultEditorOptions,
    })
    configureMonaco(monaco)
    updateEditorLanguage(activeFile)
  }, [])
  // The updateEditorLanguage function updates the language mode of the editor based on the active file's extension. It uses the getEditorLanguage utility to determine the appropriate language for syntax highlighting and other editor features.
  const updateEditorLanguage = (file: FileTreeNode | undefined) => {
    if (editorRef.current && monacoRef.current) {
      const language = file ? getEditorLanguage(file.name) : 'plaintext'
      monacoRef.current.editor.setModelLanguage(editorRef.current.getModel(), language)
    }
  }

  useEffect(()=>{
    updateEditorLanguage(activeFile)
  },[activeFile])

  return (
    <div className='h-full relative'>
      <Editor
        height="100%"
        defaultLanguage={activeFile ? getEditorLanguage(activeFile.name) : 'plaintext'}
        value={content}
        onChange={(value) => onContentChange(value || '')}
        beforeMount={(monaco) => {
          monacoRef.current = monaco
          configureMonaco(monaco)
        }}
        onMount={(editor) => {
          editorRef.current = editor
        }}
        options={{
          ...(defaultEditorOptions as any),
          readOnly: !activeFile, // Make editor read-only if no file is active
        }}
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