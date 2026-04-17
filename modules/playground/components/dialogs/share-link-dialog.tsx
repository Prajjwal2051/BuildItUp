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
    const [isLoadingLinks, setIsLoadingLinks] = React.useState(false)
    const [revokingToken, setRevokingToken] = React.useState<string | null>(null)
    const [origin, setOrigin] = React.useState<string>('')
    const [activeLinks, setActiveLinks] = React.useState<
        Array<{
            token: string
            permission: 'VIEW_ONLY' | 'VIEW_AND_EDIT'
            createdAt: string
            expiresAt: string | null
            accessCount: number
        }>
    >([])

    const formatDate = React.useCallback((iso: string | null) => {
        if (!iso) return 'Never expires'
        const date = new Date(iso)
        return Number.isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleString()
    }, [])

    const loadActiveLinks = React.useCallback(async () => {
        if (!playgroundId) return
        setIsLoadingLinks(true)
        try {
            const response = await fetch(`/api/share/playground/${playgroundId}/links`, {
                cache: 'no-store',
            })
            const payload = (await response.json().catch(() => null)) as
                | {
                    links?: Array<{
                        token: string
                        permission: 'VIEW_ONLY' | 'VIEW_AND_EDIT'
                        createdAt: string
                        expiresAt: string | null
                        accessCount: number
                    }>
                    error?: string
                }
                | null

            if (!response.ok) {
                throw new Error(payload?.error ?? 'Failed to fetch active links')
            }

            setActiveLinks(Array.isArray(payload?.links) ? payload.links : [])
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch links'
            toast.error(message)
            onLogTerminal(`[error] ${message}\n`)
        } finally {
            setIsLoadingLinks(false)
        }
    }, [onLogTerminal, playgroundId])

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
                ? parseInt(shareExpiryDays, 10) * 24
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

            const payload = (await response.json().catch(() => null)) as {
                shareUrl?: string
                token?: string
                error?: string
            } | null

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
            await loadActiveLinks()
            onLogTerminal(`[info] Share link created: ${finalShareUrl}\n`)
            toast.success('Share link generated')
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create share link'
            toast.error(message)
            onLogTerminal(`[error] ${message}\n`)
        } finally {
            setIsCreatingShareLink(false)
        }
    }, [loadActiveLinks, onLogTerminal, playgroundId, shareExpiryDays, sharePermission])

    const handleRevokeLink = React.useCallback(
        async (token: string) => {
            setRevokingToken(token)
            try {
                const response = await fetch(`/api/share/${token}/revoke`, {
                    method: 'DELETE',
                })

                const payload = (await response.json().catch(() => null)) as
                    | {
                        ok?: boolean
                        error?: string
                    }
                    | null

                if (!response.ok || !payload?.ok) {
                    throw new Error(payload?.error ?? 'Failed to revoke link')
                }

                toast.success('Share link revoked')
                onLogTerminal(`[info] Revoked share link: ${token}\n`)
                await loadActiveLinks()
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to revoke link'
                toast.error(message)
                onLogTerminal(`[error] ${message}\n`)
            } finally {
                setRevokingToken(null)
            }
        },
        [loadActiveLinks, onLogTerminal],
    )

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

    React.useEffect(() => {
        if (!isOpen) return
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin)
        }
        void loadActiveLinks()
    }, [isOpen, loadActiveLinks])

    return (
        <Dialog open={isOpen} onOpenChange={handleDialogOpen}>
            <DialogContent className="w-[min(92vw,580px)] max-w-none overflow-hidden border-[#1e2028] bg-[#11161d] p-0 text-white">
                <DialogHeader className="border-b border-[#1e2028] px-6 py-4">
                    <DialogTitle>Share Playground</DialogTitle>
                    <DialogDescription className="text-[#8ea5b5]">
                        Configure sharing options and generate a link to share with others.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[78vh] space-y-4 overflow-y-auto overflow-x-hidden px-6 py-4">
                    {!generatedShareLink ? (
                        <>
                            <div className="space-y-2">
                                <div className="text-sm font-medium">Permission Level</div>
                                <div className="flex w-full items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSharePermission('VIEW_ONLY')}
                                        className={cn(
                                            'min-w-0 flex-1 rounded-md border px-3 py-2 text-xs transition-colors',
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
                                            'min-w-0 flex-1 rounded-md border px-3 py-2 text-xs transition-colors',
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
                                <label className="py-2 text-sm font-medium">Expiry (days)</label>
                                <Input
                                    type="number"
                                    placeholder="Leave empty for no expiry"
                                    value={shareExpiryDays}
                                    onChange={(e) => setShareExpiryDays(e.target.value)}
                                    min={1}
                                    className="h-9 border-[#1e2028] bg-[#0f141b] text-white placeholder:text-[#6a7280]"
                                />
                            </div>

                            <div className="flex w-full gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="min-w-0 flex-1 rounded-md border border-[#1e2028] bg-[#0f141b] px-3 py-2 text-xs text-[#8ea5b5] transition-colors hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleGenerateShareLink()}
                                    disabled={isCreatingShareLink}
                                    className={cn(
                                        'min-w-0 flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors',
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
                                <div className="flex w-full items-start gap-2 rounded-md border border-[#1e2028] bg-[#0f141b] p-2">
                                    <input
                                        type="text"
                                        value={generatedShareLink}
                                        readOnly
                                        className="min-w-0 flex-1 bg-transparent text-xs text-[#c9d4e5] outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => void handleCopyShareLink()}
                                        className="shrink-0 rounded border border-[#1e2028] px-2 py-1 text-[11px] text-[#8ea5b5] transition-colors hover:bg-[#1e2028] hover:text-[#00d4aa]"
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

                            <div className="flex w-full gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="min-w-0 flex-1 rounded-md border border-[#1e2028] bg-[#1e2028] px-3 py-2 text-xs font-medium text-[#c9d4e5] transition-colors hover:bg-[#2a3038]"
                                >
                                    Done
                                </button>
                            </div>
                        </>
                    )}

                    <div className="space-y-2 border-t border-[#1e2028] pt-3">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">Active Links</div>
                            <button
                                type="button"
                                onClick={() => void loadActiveLinks()}
                                className="rounded border border-[#1e2028] bg-[#0f141b] px-2 py-1 text-[10px] text-[#8ea5b5] transition-colors hover:text-white"
                            >
                                Refresh
                            </button>
                        </div>

                        {isLoadingLinks ? (
                            <div className="text-xs text-[#8ea5b5]">Loading links...</div>
                        ) : activeLinks.length === 0 ? (
                            <div className="text-xs text-[#6a7280]">No active links yet.</div>
                        ) : (
                            <div className="max-h-56 space-y-2 overflow-y-auto overflow-x-hidden pr-1">
                                {activeLinks.map((link) => {
                                    const linkUrl = origin ? `${origin}/s/${link.token}` : `/s/${link.token}`
                                    return (
                                        <div
                                            key={link.token}
                                            className="rounded-md border border-[#1e2028] bg-[#0f141b] p-2"
                                        >
                                            <div className="break-all text-[11px] text-[#c9d4e5]">{linkUrl}</div>
                                            <div className="mt-1 text-[10px] leading-5 text-[#8ea5b5]">
                                                {link.permission === 'VIEW_ONLY'
                                                    ? 'View Only'
                                                    : 'View & Edit'}{' '}
                                                • Created {formatDate(link.createdAt)} • {formatDate(link.expiresAt)} • Views {link.accessCount}
                                            </div>
                                            <div className="mt-2 flex items-center justify-end">
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        try {
                                                            await navigator.clipboard.writeText(linkUrl)
                                                            toast.success('Link copied')
                                                            onLogTerminal(`[info] Copied existing link: ${linkUrl}\n`)
                                                        } catch {
                                                            toast.error('Failed to copy link')
                                                        }
                                                    }}
                                                    className="mr-2 rounded border border-[#1e2028] bg-[#11161d] p-1 text-[#8ea5b5] transition-colors hover:text-[#00d4aa]"
                                                    title="Copy link"
                                                >
                                                    <Copy size={12} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleRevokeLink(link.token)}
                                                    disabled={revokingToken === link.token}
                                                    className={cn(
                                                        'rounded border px-2 py-1 text-[10px] transition-colors',
                                                        revokingToken === link.token
                                                            ? 'cursor-not-allowed border-[#1e2028] bg-[#11161d] text-[#6a7280]'
                                                            : 'border-[#ff8b8b]/35 bg-[#ff8b8b]/10 text-[#ffb4b4] hover:bg-[#ff8b8b]/15',
                                                    )}
                                                >
                                                    {revokingToken === link.token ? 'Revoking...' : 'Revoke'}
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
