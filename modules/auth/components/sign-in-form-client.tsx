'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Chrome, Github, LockKeyhole, Sparkles, Terminal } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

const IS_DEV = process.env.NODE_ENV === 'development'

const SignInFormClient = () => {
    const searchParams = useSearchParams()
    const authError = searchParams.get('error')
    const [devLoading, setDevLoading] = React.useState(false)

    // Shows a clear recovery path when users attempt sign-in with a different OAuth provider.
    const accountLinkErrorMessage =
        authError === 'OAuthAccountNotLinked'
            ? 'An account with this email already exists. Sign in with your original provider first, then link additional providers from account settings.'
            : null

    // Uses the auth client helper so OAuth starts without relying on server actions.
    const handleGoogleSignIn = async () => {
        await signIn('google', { redirectTo: '/dashboard' })
    }

    const handleGithubSignIn = async () => {
        await signIn('github', { redirectTo: '/dashboard' })
    }

    const handleDevSignIn = async () => {
        setDevLoading(true)
        await signIn('credentials', { email: 'dev@local.dev', redirectTo: '/dashboard' })
        setDevLoading(false)
    }

    return (
        <Card className="mx-auto flex h-full w-full max-w-sm flex-col border-0 bg-transparent shadow-none">
            <CardHeader className="space-y-2.5 px-4 pt-2 pb-3 sm:px-5">
                <div
                    className="auth-stagger auth-stagger-1 auth-pill mx-auto flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-[11px] text-neutral-300"
                    style={{
                        borderColor: 'rgba(255,255,255,0.08)',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                    }}
                >
                    <Sparkles className="h-3.5 w-3.5 text-[#00d4aa]" />
                    Secure access
                </div>
                <div className="space-y-2 text-center">
                    <CardTitle className="auth-stagger auth-stagger-2 text-[1.65rem] font-semibold tracking-tight text-white">
                        Sign In
                    </CardTitle>
                    <CardDescription className="auth-stagger auth-stagger-3 text-center text-[14px] leading-5.5 text-neutral-400">
                        Choose a provider to enter your collaborative cloud workspace.
                    </CardDescription>
                </div>
            </CardHeader>

            <CardContent className="grid gap-2.5 px-4 sm:px-5">
                {accountLinkErrorMessage ? (
                    <div
                        className="rounded-2xl border px-3.5 py-2.5 text-[13px] leading-5"
                        style={{
                            borderColor: 'rgba(250,204,21,0.35)',
                            backgroundColor: 'rgba(250,204,21,0.08)',
                            color: '#fde68a',
                        }}
                    >
                        {accountLinkErrorMessage}
                    </div>
                ) : null}

                <Button
                    type="button"
                    onClick={handleGoogleSignIn}
                    variant="outline"
                    className="auth-stagger auth-stagger-4 auth-signin-btn group h-11.5 w-full justify-between rounded-2xl border px-4 text-white hover:bg-[rgba(255,255,255,0.06)]"
                    style={{
                        borderColor: '#2a2b32',
                        backgroundColor: 'rgba(17,20,24,0.85)',
                    }}
                >
                    <span className="flex items-center gap-3">
                        <span
                            className="flex h-8.5 w-8.5 items-center justify-center rounded-xl"
                            style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                        >
                            <Chrome className="h-4.5 w-4.5" />
                        </span>
                        <span className="text-[13.5px] font-medium">Continue with Google</span>
                    </span>
                    <span className="text-neutral-500 transition-colors group-hover:text-[#00d4aa]">
                        →
                    </span>
                </Button>

                <Button
                    type="button"
                    onClick={handleGithubSignIn}
                    variant="outline"
                    className="auth-stagger auth-stagger-5 auth-signin-btn group h-11.5 w-full justify-between rounded-2xl border px-4 text-white hover:bg-[rgba(255,255,255,0.06)]"
                    style={{
                        borderColor: '#2a2b32',
                        backgroundColor: 'rgba(17,20,24,0.85)',
                    }}
                >
                    <span className="flex items-center gap-3">
                        <span
                            className="flex h-8.5 w-8.5 items-center justify-center rounded-xl"
                            style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                        >
                            <Github className="h-4.5 w-4.5" />
                        </span>
                        <span className="text-[13.5px] font-medium">Continue with GitHub</span>
                    </span>
                    <span className="text-neutral-500 transition-colors group-hover:text-[#00d4aa]">
                        →
                    </span>
                </Button>

                {/* ── DEV ONLY: never renders in production ── */}
                {IS_DEV && (
                    <>
                        <div className="flex items-center gap-2 py-1">
                            <div
                                className="h-px flex-1"
                                style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
                            />
                            <span className="text-[11px] text-neutral-600">dev only</span>
                            <div
                                className="h-px flex-1"
                                style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
                            />
                        </div>

                        <Button
                            type="button"
                            onClick={handleDevSignIn}
                            disabled={devLoading}
                            variant="outline"
                            className="auth-signin-btn group h-11.5 w-full justify-between rounded-2xl border px-4 text-white hover:bg-[rgba(0,212,170,0.06)] disabled:opacity-60"
                            style={{
                                borderColor: 'rgba(0,212,170,0.25)',
                                backgroundColor: 'rgba(0,212,170,0.04)',
                            }}
                        >
                            <span className="flex items-center gap-3">
                                <span
                                    className="flex h-8.5 w-8.5 items-center justify-center rounded-xl"
                                    style={{ backgroundColor: 'rgba(0,212,170,0.08)' }}
                                >
                                    <Terminal className="h-4.5 w-4.5 text-[#00d4aa]" />
                                </span>
                                <span className="text-[13.5px] font-medium text-[#00d4aa]">
                                    {devLoading ? 'Signing in...' : 'Dev Login'}
                                </span>
                            </span>
                            <span className="text-[#00d4aa]/50 transition-colors group-hover:text-[#00d4aa]">
                                →
                            </span>
                        </Button>
                    </>
                )}
            </CardContent>

            <CardFooter className="auth-stagger auth-stagger-6 mt-auto flex flex-col items-start gap-2.5 bg-transparent px-8 pt-3 py-5 pb-2 sm:px-5">
                <div
                    className="w-full rounded-2xl border px-4 py-2.5 text-[13.5px]"
                    style={{
                        borderColor: 'rgba(255,255,255,0.08)',
                    }}
                >
                    <div className="mb-1.5 flex items-center gap-2 text-neutral-200">
                        <LockKeyhole className="h-3.5 w-3.5 text-[#00d4aa]" />
                        Protected sign-in
                    </div>
                    <p className="text-[13.5px] leading-5 text-neutral-400">
                        OAuth is handled securely through your selected provider. We do not store
                        your passwords.
                    </p>
                </div>
                <p className="text-[13.5px] leading-5.5 text-neutral-400 py-2">
                    By signing in, you agree to our{' '}
                    <a href="#" className="underline underline-offset-4 text-neutral-300 hover:text-white">
                        Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#" className="underline underline-offset-4 text-neutral-300 hover:text-white">
                        Privacy Policy
                    </a>
                    .
                </p>
            </CardFooter>
        </Card>
    )
}

export default SignInFormClient