'use client'

import React from 'react'
import { Copy, Check, Loader2 } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Manages share link generation and state within a self-contained dialog component.
interface ShareLinkDialogProps {
    isOpen: boolean
    onClose: () => void
    playgroundId: string
    onLogTerminal: (message: string) => void
}

export function ShareLinkDialog({
    isOpen,
    onClose,
    playgroundId,
    onLogTerminal,
}: ShareLinkDialogProps) {
    const [sharePermission, setSharePermission] = React.useState<'VIEW_ONLY' | 'VIEW_AND_EDIT'>(
        'VIEW_ONLY',
    )
    const [shareExpiryDays, setShareExpiryDays] = React.useState<string>('')
    const [generatedShareLink, setGeneratedShareLink] = React.useState<string | null>(null)
    const [copiedToClipboard, setCopiedToClipboard] = React.useState(false)
    const [isCreatingShareLink, setIsCreatingShareLink] = React.useState(false)

    // Reset dialog state when opened.
    const handleDialogOpen = (open: boolean) => {
        if (!open) {
            onClose()
        }
    }

    // Creates a new share link with selected permission and expiry settings.
    const handleGenerateShareLink = React.useCallback(async () => {
        if (!playgroundId) {
            toast.error('Missing playground id for sharing')
            return
        }

        setIsCreatingShareLink(true)
        try {
            const expiresIn = shareExpiryDays.trim()
                ? parseInt(shareExpiryDays, 10) * 86400
                : undefined

            const response = await fetch('/api/share/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playgroundId,
                    permission: sharePermission,
                    expiresIn,
                }),
            })

            const payload = (await response.json().catch(() => null)) as
                | {
                    shareUrl?: string
                    token?: string
                    error?: string
                }
                | null

            if (!response.ok) {
                throw new Error(payload?.error ?? 'Unable to create share link')
            }

            // Uses the returned URL when available, with an API-route fallback built from token.
            const apiShareUrl =
                typeof payload?.token === 'string' && payload.token.trim().length > 0
                    ? `${window.location.origin}/api/share/${payload.token}`
                    : ''
            const finalShareUrl =
                typeof payload?.shareUrl === 'string' && payload.shareUrl.trim().length > 0
                    ? payload.shareUrl
                    : apiShareUrl

            if (!finalShareUrl) {
                throw new Error('Share URL was not returned by the server')
            }

            setGeneratedShareLink(finalShareUrl)
            onLogTerminal(`[info] Share link created: ${finalShareUrl}\n`)
            toast.success('Share link generated')
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Failed to create share link'
            toast.error(message)
            onLogTerminal(`[error] ${message}\n`)
        } finally {
            setIsCreatingShareLink(false)
        }
    }, [playgroundId, sharePermission, shareExpiryDays, onLogTerminal])

    // Copies the generated share link to clipboard.
    const handleCopyShareLink = React.useCallback(async () => {
        if (!generatedShareLink) return

        try {
            await navigator.clipboard.writeText(generatedShareLink)
            setCopiedToClipboard(true)
            onLogTerminal(`[info] Share link copied to clipboard\n`)
            setTimeout(() => setCopiedToClipboard(false), 2000)
        } catch {
            toast.error('Failed to copy link')
        }
    }, [generatedShareLink, onLogTerminal])

    // Reset state when dialog closes.
    React.useEffect(() => {
        if (!isOpen) {
            setSharePermission('VIEW_ONLY')
            setShareExpiryDays('')
            setGeneratedShareLink(null)
            setCopiedToClipboard(false)
        }
    }, [isOpen])

    return (
        <Dialog open={isOpen} onOpenChange={handleDialogOpen}>
            <DialogContent className="max-w-md border-[#1e2028] bg-[#11161d] text-white">
                <DialogHeader>
                    <DialogTitle>Share Playground</DialogTitle>
                    <DialogDescription className="text-[#8ea5b5]">
                        Configure sharing options and generate a link to share with others.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-1">
                    {!generatedShareLink ? (
                        <>
                            <div className="space-y-2">
                                <div className="text-sm font-medium">Permission Level</div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSharePermission('VIEW_ONLY')}
                                        className={cn(
                                            'flex-1 rounded-md border px-3 py-2 text-xs transition-colors',
                                            sharePermission === 'VIEW_ONLY'
                                                ? 'border-[#0f4d40] bg-[rgba(0,212,170,0.12)] text-[#7ae8cc]'
                                                : 'border-[#1e2028] bg-[#0f141b] text-[#8ea5b5] hover:text-white',
                                        )}
                                    >
                                        View Only
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSharePermission('VIEW_AND_EDIT')}
                                        className={cn(
                                            'flex-1 rounded-md border px-3 py-2 text-xs transition-colors',
                                            sharePermission === 'VIEW_AND_EDIT'
                                                ? 'border-[#0f4d40] bg-[rgba(0,212,170,0.12)] text-[#7ae8cc]'
                                                : 'border-[#1e2028] bg-[#0f141b] text-[#8ea5b5] hover:text-white',
                                        )}
                                    >
                                        View & Edit
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="py -2 text-sm font-medium">Expiry (days)</label>
                                <Input
                                    type="number"
                                    placeholder="Leave empty for no expiry"
                                    value={shareExpiryDays}
                                    onChange={(e) => setShareExpiryDays(e.target.value)}
                                    min={1}
                                    className="h-9 py-2 border-[#1e2028] bg-[#0f141b] text-white placeholder:text-[#6a7280]"
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 rounded-md border border-[#1e2028] bg-[#0f141b] px-3 py-2 text-xs text-[#8ea5b5] transition-colors hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleGenerateShareLink()}
                                    disabled={isCreatingShareLink}
                                    className={cn(
                                        'flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                                        isCreatingShareLink
                                            ? 'cursor-not-allowed border border-[#1e2028] bg-[#0f141b] text-[#6a7280]'
                                            : 'border border-[#00d4aa]/50 bg-[rgba(0,212,170,0.1)] text-[#00d4aa] hover:border-[#00d4aa] hover:bg-[rgba(0,212,170,0.2)]',
                                    )}
                                >
                                    {isCreatingShareLink ? (
                                        <span className="flex items-center justify-center gap-1">
                                            <Loader2 size={12} className="animate-spin" />
                                            Generating...
                                        </span>
                                    ) : (
                                        'Generate'
                                    )}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <div className="text-sm font-medium">Share Link</div>
                                <div className="flex items-center gap-2 rounded-md border border-[#1e2028] bg-[#0f141b] p-2">
                                    <input
                                        type="text"
                                        value={generatedShareLink}
                                        readOnly
                                        className="flex-1 bg-transparent text-xs text-[#c9d4e5] outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => void handleCopyShareLink()}
                                        className="flex h-7 w-7 items-center justify-center rounded transition-colors text-[#8ea5b5] hover:bg-[#1e2028] hover:text-[#00d4aa]"
                                        title={copiedToClipboard ? 'Copied!' : 'Copy link'}
                                    >
                                        {copiedToClipboard ? (
                                            <Check size={14} className="text-[#00d4aa]" />
                                        ) : (
                                            <Copy size={14} />
                                        )}
                                    </button>
                                </div>
                                <p className="text-xs text-[#6a7280]">
                                    Permission:{' '}
                                    {sharePermission === 'VIEW_ONLY' ? 'View Only' : 'View & Edit'}
                                    {shareExpiryDays && ` • Expires in ${shareExpiryDays} days`}
                                </p>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 rounded-md border border-[#1e2028] bg-[#1e2028] px-3 py-2 text-xs font-medium text-[#c9d4e5] transition-colors hover:bg-[#2a3038]"
                                >
                                    Done
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
