import type { Monaco } from '@monaco-editor/react'

export const getEditorLanguage = (fileExtension: string): string => {
    const extension = fileExtension.toLowerCase()
    const languageMap: Record<string, string> = {
        // JavaScript/TypeScript
        js: 'javascript',
        jsx: 'javascript',
        ts: 'typescript',
        tsx: 'typescript',
        mjs: 'javascript',
        cjs: 'javascript',

        // Web languages
        json: 'json',
        html: 'html',
        htm: 'html',
        css: 'css',
        scss: 'scss',
        sass: 'scss',
        less: 'less',

        // Markup/Documentation
        md: 'markdown',
        markdown: 'markdown',
        xml: 'xml',
        yaml: 'yaml',
        yml: 'yaml',

        // Programming languages
        py: 'python',
        python: 'python',
        java: 'java',
        c: 'c',
        cpp: 'cpp',
        cs: 'csharp',
        php: 'php',
        rb: 'ruby',
        go: 'go',
        rs: 'rust',
        sh: 'shell',
        bash: 'shell',
        sql: 'sql',

        // Config files
        toml: 'ini',
        ini: 'ini',
        conf: 'ini',
        dockerfile: 'dockerfile',
    }

    return languageMap[extension] || 'plaintext'
}

export const configureMonaco = (monaco: Monaco) => {
    // Define an Orbit-themed dark editor palette that matches the product shell.
    monaco.editor.defineTheme('modern-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            // Comments
            { token: 'comment', foreground: '667281', fontStyle: 'italic' },
            { token: 'comment.line', foreground: '667281', fontStyle: 'italic' },
            { token: 'comment.block', foreground: '667281', fontStyle: 'italic' },

            // Keywords
            { token: 'keyword', foreground: '7EE7FF', fontStyle: 'bold' },
            { token: 'keyword.control', foreground: '7EE7FF', fontStyle: 'bold' },
            { token: 'keyword.operator', foreground: 'D6E0EE' },

            // Strings
            { token: 'string', foreground: '7AE8CC' },
            { token: 'string.quoted', foreground: '7AE8CC' },
            { token: 'string.template', foreground: '7AE8CC' },

            // Numbers
            { token: 'number', foreground: 'B6E38B' },
            { token: 'number.hex', foreground: 'B6E38B' },
            { token: 'number.float', foreground: 'B6E38B' },

            // Functions
            { token: 'entity.name.function', foreground: 'CBE48F' },
            { token: 'support.function', foreground: 'CBE48F' },

            // Variables
            { token: 'variable', foreground: 'A5D6FF' },
            { token: 'variable.parameter', foreground: 'A5D6FF' },
            { token: 'variable.other', foreground: 'A5D6FF' },

            // Types
            { token: 'entity.name.type', foreground: '5CC8FF' },
            { token: 'support.type', foreground: '5CC8FF' },
            { token: 'storage.type', foreground: '5CC8FF' },

            // Classes
            { token: 'entity.name.class', foreground: '5CC8FF' },
            { token: 'support.class', foreground: '00D4AA' },

            // Constants
            { token: 'constant', foreground: '5CC8FF' },
            { token: 'constant.language', foreground: '5CC8FF' },
            { token: 'constant.numeric', foreground: 'B6E38B' },

            // Operators
            { token: 'keyword.operator', foreground: 'D6E0EE' },
            { token: 'punctuation', foreground: 'D6E0EE' },

            // HTML/XML
            { token: 'tag', foreground: '5CC8FF' },
            { token: 'tag.id', foreground: 'A5D6FF' },
            { token: 'tag.class', foreground: 'A5D6FF' },
            { token: 'attribute.name', foreground: 'A5D6FF' },
            { token: 'attribute.value', foreground: '7AE8CC' },

            // CSS
            { token: 'attribute.name.css', foreground: 'A5D6FF' },
            { token: 'attribute.value.css', foreground: '7AE8CC' },
            { token: 'property-name.css', foreground: 'A5D6FF' },
            { token: 'property-value.css', foreground: '7AE8CC' },

            // JSON
            { token: 'key', foreground: 'A5D6FF' },
            { token: 'string.key', foreground: 'A5D6FF' },
            { token: 'string.value', foreground: '7AE8CC' },

            // Error/Warning
            { token: 'invalid', foreground: 'F44747', fontStyle: 'underline' },
            { token: 'invalid.deprecated', foreground: 'D4D4D4', fontStyle: 'strikethrough' },
        ],
        colors: {
            // Editor core — match your #0f1115 / #141821 bg
            'editor.background': '#0b1016',
            'editor.foreground': '#c9d4e5',

            // Line numbers — match your #5c6370 muted text
            'editorLineNumber.foreground': '#667281',
            'editorLineNumber.activeForeground': '#d7e2f1',

            // Cursor
            'editorCursor.foreground': '#00d4aa',

            // Selection — subtle blue tint
            'editor.selectionBackground': '#00D4AA26',
            'editor.selectionHighlightBackground': '#00D4AA18',
            'editor.inactiveSelectionBackground': '#1E202880',

            // Current line — matches your #141821 active tab bg
            'editor.lineHighlightBackground': '#101720',
            'editor.lineHighlightBorder': '#1e2028',

            // Gutter — same as editor bg
            'editorGutter.background': '#0b1016',
            'editorGutter.modifiedBackground': '#5cc8ff66',
            'editorGutter.addedBackground': '#00d4aa66',
            'editorGutter.deletedBackground': '#ff8b8b66',

            // Scrollbar
            'scrollbar.shadow': '#00000040',
            'scrollbarSlider.background': '#1e202866',
            'scrollbarSlider.hoverBackground': '#2b313c99',
            'scrollbarSlider.activeBackground': '#394250cc',

            // Minimap
            'minimap.background': '#0a0d12',
            'minimap.selectionHighlight': '#00d4aa40',

            // Find/Replace
            'editor.findMatchBackground': '#5cc8ff40',
            'editor.findMatchHighlightBackground': '#5cc8ff20',
            'editor.findRangeHighlightBackground': '#00d4aa20',

            // Word highlight
            'editor.wordHighlightBackground': '#00d4aa18',
            'editor.wordHighlightStrongBackground': '#00d4aa30',

            // Brackets
            'editorBracketMatch.background': '#5cc8ff15',
            'editorBracketMatch.border': '#5cc8ff80',

            // Indent guides — match your border color
            'editorIndentGuide.background': '#1e2028',
            'editorIndentGuide.activeBackground': '#33404e',

            // Ruler
            'editorRuler.foreground': '#1e2028',

            // Whitespace
            'editorWhitespace.foreground': '#26303a',

            // Squiggles
            'editorError.foreground': '#e06c75',
            'editorWarning.foreground': '#e5c07b',
            'editorInfo.foreground': '#5cc8ff',
            'editorHint.foreground': '#00d4aa',

            // Suggest widget — match your #141821 dropdown bg
            'editorSuggestWidget.background': '#11161d',
            'editorSuggestWidget.border': '#1e2028',
            'editorSuggestWidget.foreground': '#c9d4e5',
            'editorSuggestWidget.selectedBackground': '#16202a',
            'editorSuggestWidget.highlightForeground': '#00d4aa',

            // Hover widget
            'editorHoverWidget.background': '#11161d',
            'editorHoverWidget.border': '#1e2028',
            'editorHoverWidget.foreground': '#c9d4e5',

            // Inline ghost text for AI autocomplete
            'editorGhostText.foreground': '#6f92a0',
            'editorGhostText.border': '#00000000',
            'editorGhostText.background': '#00000000',

            // Panel / sidebar (matches your sidebar bg)
            'panel.background': '#0a0d12',
            'panel.border': '#1e2028',
            'sideBar.background': '#0c1117',
            'sideBar.foreground': '#c9d4e5',
            'sideBar.border': '#1e2028',
            'activityBar.background': '#0c1117',
            'activityBar.foreground': '#c9d4e5',
            'activityBar.border': '#1e2028',
        },
    })

    // Set the theme
    monaco.editor.setTheme('modern-dark')

    // Configure additional editor settings
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
    })

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
    })

    // Set compiler options for better IntelliSense
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.Latest,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        reactNamespace: 'React',
        allowJs: true,
        typeRoots: ['node_modules/@types'],
    })

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.Latest,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        reactNamespace: 'React',
        allowJs: true,
        typeRoots: ['node_modules/@types'],
    })
}

export const defaultEditorOptions = {
    // Font settings
    fontSize: 14,
    fontFamily:
        "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace",
    fontLigatures: true,
    fontWeight: '400',

    // Layout
    minimap: {
        enabled: true,
        size: 'proportional',
        showSlider: 'mouseover',
    },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    padding: { top: 16, bottom: 16 },

    // Line settings
    lineNumbers: 'on',
    lineHeight: 20,
    renderLineHighlight: 'all',
    renderWhitespace: 'selection',

    // Indentation
    tabSize: 2,
    insertSpaces: true,
    detectIndentation: true,

    // Word wrapping
    wordWrap: 'on',
    wordWrapColumn: 120,
    wrappingIndent: 'indent',

    // Code folding
    folding: true,
    foldingHighlight: true,
    foldingStrategy: 'indentation',
    showFoldingControls: 'mouseover',

    // Scrolling
    smoothScrolling: true,
    mouseWheelZoom: true,
    fastScrollSensitivity: 5,

    // Selection
    multiCursorModifier: 'ctrlCmd',
    selectionHighlight: true,
    occurrencesHighlight: true,

    // Suggestions
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on',
    tabCompletion: 'on',
    wordBasedSuggestions: true,
    quickSuggestions: {
        other: true,
        comments: false,
        strings: false,
    },

    // Formatting
    formatOnPaste: true,
    formatOnType: true,

    // Bracket matching
    matchBrackets: 'always',
    bracketPairColorization: {
        enabled: true,
    },

    // Guides
    renderIndentGuides: true,
    highlightActiveIndentGuide: true,
    rulers: [80, 120],

    // Performance
    disableLayerHinting: false,
    disableMonospaceOptimizations: false,

    // Accessibility
    accessibilitySupport: 'auto',

    // Cursor
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: true,
    cursorStyle: 'line',
    cursorWidth: 2,

    // Find
    find: {
        addExtraSpaceOnTop: false,
        autoFindInSelection: 'never',
        seedSearchStringFromSelection: 'always',
    },

    // Hover
    hover: {
        enabled: true,
        delay: 300,
        sticky: true,
    },

    // Semantic highlighting
    'semanticHighlighting.enabled': true,

    // Sticky scroll
    stickyScroll: {
        enabled: true,
    },
}
