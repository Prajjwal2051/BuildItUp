'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import type { Project } from '@/modules/dashboard/types'
import { cn } from '@/lib/utils'

interface ProjectSearchProps {
    projects: Project[]
    className?: string
}

// This component lets users quickly find a project by typing and seeing live matches.
// It keeps search local to improve speed and avoid extra server requests.
function ProjectSearch({ projects, className }: ProjectSearchProps) {
    const [query, setQuery] = useState('')
    const trimmedQuery = query.trim().toLowerCase()
    const showResultsMenu = trimmedQuery.length > 0

    const mounted = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false,
    )

    // Keep the page still while the search menu is open so the results feel like a modal.
    useEffect(() => {
        if (!showResultsMenu) return

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setQuery('')
        }
        window.addEventListener('keydown', handleKeyDown)

        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [showResultsMenu])

    // This filter checks title, description, and template so users can find projects faster.
    const filteredProjects = useMemo(() => {
        if (!trimmedQuery) {
            return []
        }

        return projects
            .filter((project) => {
                const title = project.title.toLowerCase()
                const description = project.description.toLowerCase()
                const template = project.template.toLowerCase()

                return (
                    title.includes(trimmedQuery) ||
                    description.includes(trimmedQuery) ||
                    template.includes(trimmedQuery)
                )
            })
            .slice(0, 8)
    }, [projects, trimmedQuery])

    const closeResultsMenu = () => setQuery('')

    return (
        <div
            className={cn(
                'relative w-full',
                className,
            )}
        >
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search projects, branches, or commands…"
                    aria-label="Search projects, branches, or commands"
                    className="h-11 w-full rounded-xl border pl-9 text-sm shadow-sm focus-visible:ring-1 border-slate-300 bg-[#f9f6ee] text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-400 dark:border-[#1e2028] dark:bg-[rgba(18,19,24,0.88)] dark:text-slate-100 dark:placeholder:text-neutral-500 dark:focus-visible:ring-[#00d4aa]/40 dark:focus-visible:border-[#00d4aa]/25"
                />

                {showResultsMenu && mounted && createPortal(
                    <div
                        className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/20 px-4 py-6 backdrop-blur-xl dark:bg-black/60"
                        onClick={closeResultsMenu}
                        role="presentation"
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-label="Project search results"
                            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-[#f9f6ee]/95 shadow-2xl shadow-slate-200/40 dark:border-[#1e2028] dark:bg-[#11161d]/95 dark:shadow-black/50"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4 dark:border-[#1e2028]">
                                <div className="flex flex-1 items-center gap-3">
                                    <Search className="h-5 w-5 text-slate-400 dark:text-neutral-500" />
                                    <input
                                        autoFocus
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        placeholder="Search projects, branches, or commands…"
                                        className="flex-1 bg-transparent text-lg text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-neutral-500"
                                    />
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="hidden whitespace-nowrap text-xs text-slate-500 sm:block dark:text-neutral-500">
                                        {filteredProjects.length > 0
                                            ? `${filteredProjects.length} matching project${filteredProjects.length === 1 ? '' : 's'}`
                                            : 'No results'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={closeResultsMenu}
                                        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-[#1e2028] dark:text-neutral-400 dark:hover:bg-[rgba(0,212,170,0.08)] dark:hover:text-slate-100"
                                    >
                                        Esc
                                    </button>
                                </div>
                            </div>

                            {filteredProjects.length > 0 ? (
                                <ul className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
                                    {filteredProjects.map((project) => (
                                        <li key={project.id}>
                                            <Link
                                                href={`/playground/${project.id}`}
                                                onClick={closeResultsMenu}
                                                className="flex flex-col gap-1 rounded-xl px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-[rgba(0,212,170,0.06)]"
                                            >
                                                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                    {project.title}
                                                </span>
                                                <span className="line-clamp-1 text-xs text-slate-500 dark:text-neutral-500">
                                                    {project.description}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-neutral-500">
                                    No matching projects found.
                                </div>
                            )}
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </div>
    )
}


export default ProjectSearch
