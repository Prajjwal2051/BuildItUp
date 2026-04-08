'use client'

import { Button } from '@/components/ui/button'
import { ArrowDown, Loader2 } from 'lucide-react'
import React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createPlaygroundFromGithubRepo } from '../actions'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const AddRepoButton = ({ className }: { className?: string }) => {
    const router = useRouter()
    const [isOpen, setIsOpen] = React.useState(false)
    const [repoUrl, setRepoUrl] = React.useState('')
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    // Submits the GitHub URL, creates a playground from repository files, and opens it.
    const handleImportRepo = async () => {
        const normalized = repoUrl.trim()
        if (!normalized) {
            toast.error('Please enter a GitHub repository URL')
            return
        }

        setIsSubmitting(true)
        try {
            const playground = await createPlaygroundFromGithubRepo(normalized)
            if (!playground?.id) {
                throw new Error('Failed to import repository')
            }

            toast.success('Repository imported successfully')
            setIsOpen(false)
            setRepoUrl('')
            router.push(`/playground/${playground.id}`)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to import repository'
            toast.error(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(true)}
                className={cn(
                    'h-11 gap-2 rounded-lg border px-4 text-sm font-medium shadow-sm transition-colors',
                    'border-slate-300 bg-[#f9f6ee] text-slate-900 hover:bg-[#f4efe3] hover:text-slate-950', // Light mode
                    'dark:border-[#1e2028] dark:bg-[rgba(18,19,24,0.88)] dark:text-slate-100 dark:hover:bg-[rgba(0,212,170,0.08)] dark:hover:text-white', // Dark mode
                    className,
                )}
            >
                <ArrowDown
                    size={14}
                    className="transition-transform duration-300 group-hover:translate-y-0.5"
                />
                <span>Open GitHub Repo</span>
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Import GitHub Repository</DialogTitle>
                        <DialogDescription>
                            Paste a public GitHub repo URL. We will create a new playground from its
                            files.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <Input
                            placeholder="https://github.com/owner/repo"
                            value={repoUrl}
                            onChange={(event) => setRepoUrl(event.target.value)}
                            disabled={isSubmitting}
                        />

                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsOpen(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={() => void handleImportRepo()}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    'Import Repo'
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default AddRepoButton
