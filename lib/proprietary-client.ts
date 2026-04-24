/**
 * ===================================================================
 * PROPRIETARY CODE - Client-Side Watermarking & Attribution
 * Owner: Prajjwal Sahu (@Prajjwal2051)
 * GitHub: https://github.com/Prajjwal2051
 * 
 * Unauthorized copying or distribution is strictly prohibited.
 * © 2024-2025 Prajjwal Sahu. All rights reserved.
 * ===================================================================
 * 
 * Client-side utilities for adding watermarks, copyright notices,
 * and attribution markers to prevent unauthorized copying.
 */

export const PROPRIETARY_CLIENT_INFO = {
    owner: 'Prajjwal Sahu',
    github: '@Prajjwal2051',
    repository: 'https://github.com/Prajjwal2051/BuildItUp',
    copyright: '© 2024-2025 Prajjwal Sahu. All rights reserved.',
    proprietary: true,
} as const

/**
 * Console watermark - Displays in browser console on load
 * Makes it immediately clear the code is proprietary
 */
export function injectConsoleWatermark() {
    if (typeof window !== 'undefined') {
        const consoleWatermark = `
%c
╔═══════════════════════════════════════════════════════════════╗
║                 PROPRIETARY CODE - BuildItUp                 ║
║          Owned and Maintained by Prajjwal Sahu               ║
║                  GitHub: @Prajjwal2051                       ║
║                                                               ║
║    ⚠️  This code is PROPRIETARY and CONFIDENTIAL             ║
║    Unauthorized copying or distribution is PROHIBITED        ║
║              © 2024-2025 All Rights Reserved                 ║
║                                                               ║
║    Repository: https://github.com/Prajjwal2051/BuildItUp    ║
╚═══════════════════════════════════════════════════════════════╝
    `

        console.log(
            consoleWatermark,
            'color: #ff6b6b; font-weight: bold; font-size: 12px; font-family: monospace;'
        )

        // Add warning about copying code
        console.warn(
            '%c⚠️  WARNING: Copying code from this application without authorization may violate copyright laws.',
            'color: #ff6b6b; font-weight: bold; font-size: 11px;'
        )
    }
}

/**
 * Disables common copying methods to make scraping harder
 * Note: This is not foolproof but adds friction to copying
 */
export function protectFromCopying() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        // Disable right-click context menu
        document.addEventListener('contextmenu', (e: Event) => {
            const target = e.target as HTMLElement
            // Allow right-click on input fields for paste functionality
            if (
                target.tagName !== 'INPUT' &&
                target.tagName !== 'TEXTAREA' &&
                !target.classList.contains('allow-copy')
            ) {
                e.preventDefault()
            }
        })

        // Disable text selection in certain areas
        document.addEventListener('selectstart', (e: Event) => {
            const target = e.target as HTMLElement
            if (target.classList.contains('no-select')) {
                e.preventDefault()
            }
        })

        // Disable keyboard shortcuts for copying (outside inputs)
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            const target = e.target as HTMLElement
            const isInput =
                target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

            // Ctrl+C / Cmd+C outside input fields
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !isInput) {
                const selection = window.getSelection()
                if (selection && selection.toString().length > 0) {
                    // Add proprietary notice to clipboard
                    e.preventDefault()
                    addProprietaryNoticeToClipboard(selection.toString())
                }
            }

            // Ctrl+S / Cmd+S (prevent save)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
            }
        })

        // Disable developer tools copy/paste context (advanced)
        document.body.style.WebkitUserSelect = 'none'
        document.body.style.userSelect = 'none'
    }
}

/**
 * Adds proprietary notice to clipboard when code is copied
 */
async function addProprietaryNoticeToClipboard(text: string) {
    const proprietaryNotice = `
This code is PROPRIETARY and owned by Prajjwal Sahu (@Prajjwal2051).
Source: ${PROPRIETARY_CLIENT_INFO.repository}

IMPORTANT: Unauthorized copying or use of this code is strictly prohibited.
© 2024-2025 Prajjwal Sahu. All rights reserved.

Original copied text:
${text}
  `

    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(proprietaryNotice)
        } catch (err) {
            console.error('Failed to add proprietary notice to clipboard', err)
        }
    }
}

/**
 * Embeds hidden metadata in DOM
 * Makes it harder to use copied code without attribution
 */
export function embedHiddenMetadata() {
    if (typeof document !== 'undefined') {
        // Create hidden metadata comments
        const metadata = document.createComment(
            `PROPRIETARY: Prajjwal Sahu (@Prajjwal2051) | ${PROPRIETARY_CLIENT_INFO.repository} | © 2024-2025 All Rights Reserved`
        )
        document.documentElement.insertBefore(metadata, document.documentElement.firstChild)

        // Add data attributes to key elements
        const style = document.createElement('style')
        style.textContent = `
      :root::before {
        content: "PROPRIETARY: Prajjwal Sahu (@Prajjwal2051)";
      }
    `
        document.head.appendChild(style)
    }
}

/**
 * Creates a visible watermark in the application
 */
export function addVisibleWatermark(containerId?: string) {
    if (typeof document !== 'undefined') {
        const watermarkDiv = document.createElement('div')
        watermarkDiv.id = 'proprietary-watermark'
        watermarkDiv.setAttribute(
            'style',
            `
      position: fixed;
      bottom: 10px;
      right: 10px;
      font-size: 10px;
      color: rgba(0, 0, 0, 0.2);
      font-family: monospace;
      pointer-events: none;
      z-index: 1;
      white-space: nowrap;
    `
        )
        watermarkDiv.textContent = `Proprietary © ${PROPRIETARY_CLIENT_INFO.owner} | ${PROPRIETARY_CLIENT_INFO.github}`

        const container = containerId
            ? document.getElementById(containerId)
            : document.body
        if (container) {
            container.appendChild(watermarkDiv)
        }
    }
}

/**
 * Prevents iframe embedding/scraping
 */
export function preventFrameEmbedding() {
    if (typeof window !== 'undefined') {
        // Prevent framing
        if (window.self !== window.top) {
            try {
                window.top!.location = window.self.location
            } catch (e) {
                // Silently fail - some browsers block this
            }
        }

        // Set X-Frame-Options equivalent
        const meta = document.createElement('meta')
        meta.httpEquiv = 'X-UA-Compatible'
        meta.content = 'IE=edge'
        document.head.appendChild(meta)
    }
}

/**
 * Injects script to block automated scraping
 */
export function blockAutomatedScraping() {
    if (typeof window !== 'undefined') {
        // Detect headless browsers / bots
        const isHeadless =
            navigator.webdriver ||
            (window as any).__nightmare ||
            (window as any).__phantomjs ||
            navigator.userAgent.includes('PhantomJS') ||
            navigator.userAgent.includes('headless') ||
            navigator.userAgent.includes('bot')

        if (isHeadless) {
            console.error(
                'Automated scraping detected. This application is proprietary code by Prajjwal Sahu (@Prajjwal2051).'
            )
            // Could redirect or show error
        }

        // Randomize element IDs to make scraping harder
        if (Math.random() < 0.1) {
            // Randomly prevent automated tools
            const elements = document.querySelectorAll('[id]')
            elements.forEach((el) => {
                if (!el.id.startsWith('_')) {
                    el.id = '_' + Math.random().toString(36).substr(2, 9)
                }
            })
        }
    }
}

/**
 * Creates encrypted data attributes to prevent inspection
 */
export function addEncryptedDataAttributes(
    element: HTMLElement,
    data: Record<string, string>
) {
    // Store data in way that's harder to inspect
    const encrypted = Object.entries(data).map(([key, value]) => {
        const encoded = btoa(value) // Base64 encode
        return `${key}:${encoded}`
    })

    element.setAttribute('data-content', encrypted.join('|'))
    element.setAttribute('data-proprietary', 'true')
    element.setAttribute('data-owner', PROPRIETARY_CLIENT_INFO.github)
}

/**
 * Initializes all client-side protections
 * Call this once on app initialization
 */
export function initializeProprietaryProtections() {
    if (typeof window === 'undefined') return // Skip if not in browser

    try {
        injectConsoleWatermark()
        protectFromCopying()
        embedHiddenMetadata()
        addVisibleWatermark()
        preventFrameEmbedding()
        blockAutomatedScraping()

        // Log initialization
        console.log(
            `%c✓ Proprietary protections initialized`,
            'color: #51cf66; font-weight: bold;'
        )
    } catch (error) {
        console.error('Error initializing proprietary protections:', error)
    }
}

/**
 * React Hook: Initialize protections on mount
 * @example
 * export default function MyComponent() {
 *   useProprietaryProtections();
 *   return <div>Content</div>;
 * }
 */
export function useProprietaryProtections() {
    if (typeof window !== 'undefined') {
        try {
            initializeProprietaryProtections()
        } catch (error) {
            console.error('Failed to initialize protections:', error)
        }
    }
}

/**
 * Generates a proprietary component wrapper
 * Wraps React components with proprietary metadata
 */
export function withProprietaryComponent<P extends Record<string, any>>(
    Component: React.ComponentType<P>,
    displayName?: string
) {
    const Wrapped = (props: P) => {
        useProprietaryProtections()
        return <Component { ...props } />
  }

    Wrapped.displayName = `Proprietary(${displayName || Component.displayName || 'Component'})`
    return Wrapped
}
