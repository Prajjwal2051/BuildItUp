"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

// This control lets users switch between light and dark modes with one click.
// We wait for mount so the icon always matches the active client theme.
function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full border-border bg-background"
                aria-label="Toggle theme"
            >
                <Sun className="h-4 w-4" />
            </Button>
        )
    }

    const isDark = theme === "dark"

    return (
        <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full border-border bg-background"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setTheme(isDark ? "light" : "dark")}
        >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
    )
}

export default ThemeToggle
