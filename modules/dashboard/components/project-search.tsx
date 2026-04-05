'use client'

import { useMemo, useState } from 'react'
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

  const showDropdown = trimmedQuery.length > 0

  return (
    <div
      className={cn('fixed top-4 left-1/2 z-50 w-[min(92vw,520px)] -translate-x-1/2', className)}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for Projects"
          aria-label="Search for Projects"
          className="h-10 rounded-xl bg-background pl-9"
        />

        {showDropdown && (
          <div className="absolute top-12 z-50 w-full overflow-hidden rounded-xl border bg-popover shadow-lg">
            {filteredProjects.length > 0 ? (
              <ul className="max-h-80 overflow-y-auto p-1">
                {filteredProjects.map((project) => (
                  <li key={project.id}>
                    <Link
                      href={`/playground/${project.id}`}
                      className="flex flex-col gap-0.5 rounded-lg px-3 py-2 transition-colors hover:bg-accent"
                    >
                      <span className="text-sm font-medium text-foreground">{project.title}</span>
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {project.description}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No matching projects found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectSearch
