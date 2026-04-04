"use client"

import React from "react"
import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import { SearchAddon } from "@xterm/addon-search"

interface PlaygroundTerminalProps {
    logs: string[]
    className?: string
    onCommand?: (command: string) => void | Promise<void>
}

// Renders an xterm.js terminal so process output feels like a real terminal panel.
function PlaygroundTerminal({ logs, className, onCommand }: PlaygroundTerminalProps) {
    const hostRef = React.useRef<HTMLDivElement | null>(null)
    const terminalRef = React.useRef<Terminal | null>(null)
    const fitAddonRef = React.useRef<FitAddon | null>(null)
    const writtenLogCountRef = React.useRef(0)
    const inputBufferRef = React.useRef("")
    const promptRef = React.useRef("$ ")
    const isDisposedRef = React.useRef(false)
    const frameRef = React.useRef<number | null>(null)

    React.useLayoutEffect(() => {
        if (!hostRef.current || terminalRef.current) return
        isDisposedRef.current = false

        const terminal = new Terminal({
            cursorBlink: true,
            convertEol: true,
            fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12,
            lineHeight: 1.35,
            letterSpacing: 0.2,
            scrollback: 5000,
            theme: {
                background: "#070b14",
                foreground: "#c7d5f2",
                cursor: "#79c0ff",
                selectionBackground: "#274a78",
                black: "#0b1220",
                red: "#ff7b72",
                green: "#56d364",
                yellow: "#e3b341",
                blue: "#79c0ff",
                magenta: "#d2a8ff",
                cyan: "#7ee7ff",
                white: "#c7d5f2",
                brightBlack: "#334155",
                brightRed: "#ffa198",
                brightGreen: "#7ee787",
                brightYellow: "#f2cc60",
                brightBlue: "#a5d6ff",
                brightMagenta: "#e2b8ff",
                brightCyan: "#a5f3fc",
                brightWhite: "#e6edf3",
            },
        })

        const fitAddon = new FitAddon()
        const webLinksAddon = new WebLinksAddon()
        const searchAddon = new SearchAddon()

        terminal.loadAddon(fitAddon)
        terminal.loadAddon(webLinksAddon)
        terminal.loadAddon(searchAddon)
        terminal.open(hostRef.current)
        terminal.write(`${promptRef.current}`)

        // Handles basic terminal input so users can type and submit commands.
        terminal.onData((data) => {
            const code = data.charCodeAt(0)
            if (code === 13) {
                const command = inputBufferRef.current.trim()
                terminal.write("\r\n")
                if (command.length > 0) {
                    void onCommand?.(command)
                }
                inputBufferRef.current = ""
                terminal.write(promptRef.current)
                return
            }

            if (code === 127 || code === 8) {
                if (inputBufferRef.current.length > 0) {
                    inputBufferRef.current = inputBufferRef.current.slice(0, -1)
                    terminal.write("\b \b")
                }
                return
            }

            if (code >= 32) {
                inputBufferRef.current += data
                terminal.write(data)
            }
        })

        // Copies selected text on Ctrl/Cmd+C so terminal output is easy to reuse.
        terminal.attachCustomKeyEventHandler((event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
                const selection = terminal.getSelection()
                if (selection) {
                    void navigator.clipboard.writeText(selection)
                    return false
                }
            }
            return true
        })

        // Delay first fit to the next paint so xterm has stable viewport dimensions.
        frameRef.current = window.requestAnimationFrame(() => {
            if (isDisposedRef.current) return
            fitAddonRef.current?.fit()
        })

        terminalRef.current = terminal
        fitAddonRef.current = fitAddon

        const resizeObserver = new ResizeObserver(() => {
            if (isDisposedRef.current) return
            fitAddonRef.current?.fit()
        })
        resizeObserver.observe(hostRef.current)

        return () => {
            isDisposedRef.current = true
            if (frameRef.current !== null) {
                window.cancelAnimationFrame(frameRef.current)
                frameRef.current = null
            }
            resizeObserver.disconnect()
            terminal.dispose()
            terminalRef.current = null
            fitAddonRef.current = null
            writtenLogCountRef.current = 0
            inputBufferRef.current = ""
        }
    }, [onCommand])

    // Streams only new log chunks into xterm so rendering stays smooth.
    React.useEffect(() => {
        const terminal = terminalRef.current
        if (!terminal) return

        if (logs.length < writtenLogCountRef.current) {
            terminal.clear()
            writtenLogCountRef.current = 0
        }

        for (let i = writtenLogCountRef.current; i < logs.length; i += 1) {
            terminal.write(logs[i])
        }

        writtenLogCountRef.current = logs.length
        terminal.scrollToBottom()
    }, [logs])

    return (
        <div className={className}>
            <div className="h-full rounded-md border border-[#1d2a40] bg-linear-to-b from-[#070b14] via-[#060912] to-[#05070d] p-2 shadow-[inset_0_1px_0_rgba(121,192,255,0.12)]">
                <div ref={hostRef} className="h-full w-full overflow-hidden rounded-sm" />
            </div>
        </div>
    )
}

export default PlaygroundTerminal
