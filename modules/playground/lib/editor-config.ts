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
    // Define a beautiful modern dark theme
    monaco.editor.defineTheme('modern-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            // Comments
            { token: 'comment', foreground: '7C7C7C', fontStyle: 'italic' },
            { token: 'comment.line', foreground: '7C7C7C', fontStyle: 'italic' },
            { token: 'comment.block', foreground: '7C7C7C', fontStyle: 'italic' },

            // Keywords
            { token: 'keyword', foreground: 'C586C0', fontStyle: 'bold' },
            { token: 'keyword.control', foreground: 'C586C0', fontStyle: 'bold' },
            { token: 'keyword.operator', foreground: 'D4D4D4' },

            // Strings
            { token: 'string', foreground: 'd19a66' },
            { token: 'string.quoted', foreground: 'd19a66' },
            { token: 'string.template', foreground: 'd19a66' },

            // Numbers
            { token: 'number', foreground: 'B5CEA8' },
            { token: 'number.hex', foreground: 'B5CEA8' },
            { token: 'number.float', foreground: 'B5CEA8' },

            // Functions
            { token: 'entity.name.function', foreground: 'DCDCAA' },
            { token: 'support.function', foreground: 'DCDCAA' },

            // Variables
            { token: 'variable', foreground: '9CDCFE' },
            { token: 'variable.parameter', foreground: '9CDCFE' },
            { token: 'variable.other', foreground: '9CDCFE' },

            // Types
            { token: 'entity.name.type', foreground: '61afef' },
            { token: 'support.type', foreground: '61afef' },
            { token: 'storage.type', foreground: '569CD6' },

            // Classes
            { token: 'entity.name.class', foreground: '61afef' },
            { token: 'support.class', foreground: '4EC9B0' },

            // Constants
            { token: 'constant', foreground: '4FC1FF' },
            { token: 'constant.language', foreground: '569CD6' },
            { token: 'constant.numeric', foreground: 'B5CEA8' },

            // Operators
            { token: 'keyword.operator', foreground: 'D4D4D4' },
            { token: 'punctuation', foreground: 'D4D4D4' },

            // HTML/XML
            { token: 'tag', foreground: '569CD6' },
            { token: 'tag.id', foreground: '9CDCFE' },
            { token: 'tag.class', foreground: '92C5F8' },
            { token: 'attribute.name', foreground: '9CDCFE' },
            { token: 'attribute.value', foreground: 'CE9178' },

            // CSS
            { token: 'attribute.name.css', foreground: '9CDCFE' },
            { token: 'attribute.value.css', foreground: 'CE9178' },
            { token: 'property-name.css', foreground: '9CDCFE' },
            { token: 'property-value.css', foreground: 'CE9178' },

            // JSON
            { token: 'key', foreground: '9CDCFE' },
            { token: 'string.key', foreground: '9CDCFE' },
            { token: 'string.value', foreground: 'CE9178' },

            // Error/Warning
            { token: 'invalid', foreground: 'F44747', fontStyle: 'underline' },
            { token: 'invalid.deprecated', foreground: 'D4D4D4', fontStyle: 'strikethrough' },
        ],
        colors: {
            // Editor core — match your #0f1115 / #141821 bg
            'editor.background': '#0f1115',
            'editor.foreground': '#aab1bf',

            // Line numbers — match your #5c6370 muted text
            'editorLineNumber.foreground': '#5c6370',
            'editorLineNumber.activeForeground': '#c5c9d4',

            // Cursor
            'editorCursor.foreground': '#61afef',

            // Selection — subtle blue tint
            'editor.selectionBackground': '#264F7840',
            'editor.selectionHighlightBackground': '#61afef18',
            'editor.inactiveSelectionBackground': '#1c1f2680',

            // Current line — matches your #141821 active tab bg
            'editor.lineHighlightBackground': '#141821',
            'editor.lineHighlightBorder': '#1c1f26',

            // Gutter — same as editor bg
            'editorGutter.background': '#0f1115',
            'editorGutter.modifiedBackground': '#e5c07b66',
            'editorGutter.addedBackground': '#98c37966',
            'editorGutter.deletedBackground': '#e06c7566',

            // Scrollbar
            'scrollbar.shadow': '#00000040',
            'scrollbarSlider.background': '#2a2f3a66',
            'scrollbarSlider.hoverBackground': '#2a2f3a99',
            'scrollbarSlider.activeBackground': '#2a2f3acc',

            // Minimap
            'minimap.background': '#0d1015',
            'minimap.selectionHighlight': '#61afef40',

            // Find/Replace
            'editor.findMatchBackground': '#d19a6640',
            'editor.findMatchHighlightBackground': '#d19a6620',
            'editor.findRangeHighlightBackground': '#98c37920',

            // Word highlight
            'editor.wordHighlightBackground': '#61afef18',
            'editor.wordHighlightStrongBackground': '#61afef30',

            // Brackets
            'editorBracketMatch.background': '#61afef15',
            'editorBracketMatch.border': '#61afef80',

            // Indent guides — match your border color
            'editorIndentGuide.background': '#1c1f26',
            'editorIndentGuide.activeBackground': '#2a2f3a',

            // Ruler
            'editorRuler.foreground': '#1c1f26',

            // Whitespace
            'editorWhitespace.foreground': '#2a2f3a',

            // Squiggles
            'editorError.foreground': '#e06c75',
            'editorWarning.foreground': '#e5c07b',
            'editorInfo.foreground': '#61afef',
            'editorHint.foreground': '#98c379',

            // Suggest widget — match your #141821 dropdown bg
            'editorSuggestWidget.background': '#141821',
            'editorSuggestWidget.border': '#2a2f3a',
            'editorSuggestWidget.foreground': '#aab1bf',
            'editorSuggestWidget.selectedBackground': '#1c1f26',
            'editorSuggestWidget.highlightForeground': '#61afef',

            // Hover widget
            'editorHoverWidget.background': '#141821',
            'editorHoverWidget.border': '#2a2f3a',
            'editorHoverWidget.foreground': '#aab1bf',

            // Panel / sidebar (matches your sidebar bg)
            'panel.background': '#0f1115',
            'panel.border': '#1c1f26',
            'sideBar.background': '#0f1115',
            'sideBar.foreground': '#aab1bf',
            'sideBar.border': '#1c1f26',
            'activityBar.background': '#0f1115',
            'activityBar.foreground': '#aab1bf',
            'activityBar.border': '#1c1f26',
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
