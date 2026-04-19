import type { Metadata } from 'next'
import Link from 'next/link'
import {
    ArrowRight,
    BookOpen,
    Bot,
    Chrome,
    ExternalLink,
    Github,
    KeyRound,
    LogIn,
    Rocket,
    Settings,
    ShieldCheck,
    Sparkles,
    Terminal,
} from 'lucide-react'
import HomeFooter from '@/modules/home/footer'
import HomeHeader from '@/modules/home/header'
import { MouseGlow } from '@/components/ui/mouse-glow'
import { FloatingOrbs, MotionCard, ScrollReveal } from '@/components/animations/scroll-effects'

export const metadata: Metadata = {
    title: 'Orbit Code Docs',
    description:
        'Documentation for AI providers, OAuth sign-in, and getting started with Orbit Code.',
}

const aiProviders = [
    {
        name: 'Ollama (Local)',
        model: 'qwen2.5-coder:7b',
        key: 'No API key required',
        notes: 'Best for local development. Requires a running Ollama server and local env setup.',
    },
    {
        name: 'Ollama (Remote)',
        model: 'qwen2.5-coder:7b',
        key: 'Optional bearer token',
        notes: 'Use your own remote Ollama instance if you want private hosted inference.',
    },
    {
        name: 'OpenAI',
        model: 'gpt-4o-mini',
        key: 'API key required',
        notes: 'Fast, reliable default for chat and code completion.',
    },
    {
        name: 'Google Gemini',
        model: 'gemini-2.0-flash',
        key: 'API key required',
        notes: 'Good free-tier option through Google AI Studio.',
    },
    {
        name: 'Anthropic Claude',
        model: 'claude-3-5-haiku-20241022',
        key: 'API key required',
        notes: 'Strong reasoning and code quality.',
    },
    {
        name: 'OpenRouter',
        model: 'openai/gpt-4o-mini',
        key: 'API key required',
        notes: 'Lets you access multiple model families behind one provider key.',
    },
]

const oauthProviders = [
    {
        name: 'Google OAuth',
        icon: Chrome,
        notes: 'Use your Google account to sign in and jump straight into the dashboard.',
    },
    {
        name: 'GitHub OAuth',
        icon: Github,
        notes: 'Best if you already live in GitHub and want a code-first login flow.',
    },
]

const docsHighlights = [
    {
        title: 'OAuth access',
        icon: LogIn,
        body: 'Google and GitHub sign-in are the supported login paths for real users.',
    },
    {
        title: 'AI everywhere',
        icon: Bot,
        body: 'The same configured provider powers AI chat, completion tests, and inline editor suggestions.',
    },
    {
        title: 'Key handling',
        icon: ShieldCheck,
        body: 'Saved provider keys are encrypted before storage and are never returned in plaintext.',
    },
]

const setupSteps = [
    'Choose a provider in AI Settings and save the credentials you want to use.',
    'Run the built-in connection test before opening a real playground session.',
    'Use the sidebar chat for longer prompts and inline completions for fast edits.',
]

const previewStartCommands = [
    { template: 'Next.js / Hono', command: 'npm install then npm run dev' },
    { template: 'React / Express / Angular', command: 'npm install then npm start' },
    { template: 'Vue', command: 'npm install then npm run serve' },
]

function DocsPage() {
    return (
        <div className="relative min-h-screen overflow-x-hidden bg-[#0a0d12] font-sans text-white antialiased">
            <MouseGlow />
            <FloatingOrbs className="z-0" />
            <div
                className="pointer-events-none fixed inset-0 z-0"
                style={{
                    background: `
      radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,212,170,0.05) 0%, transparent 70%),
      radial-gradient(ellipse 100% 50% at 50% 100%, rgba(0,60,40,0.16) 0%, transparent 60%)
    `,
                }}
            />
            <div className="pointer-events-none fixed inset-0 z-0 bg-dot-pattern bg-dot-drift opacity-60" />

            <div className="relative z-10 flex min-h-screen flex-col">
                <HomeHeader />

                <main className="mx-auto flex w-full max-w-360 flex-1 flex-col gap-10 px-6 pb-24 pt-16 md:px-10 md:pt-24">
                    <ScrollReveal y={34}>
                        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                            <div className="space-y-5">
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-neutral-300">
                                    <BookOpen className="h-4 w-4 text-[#00d4aa]" />
                                    Product documentation
                                </div>
                                <div className="space-y-4">
                                    <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                                        Docs for sign-in, AI setup, and everyday use in Orbit Code
                                    </h1>
                                    <p className="max-w-3xl text-[16px] leading-7 text-neutral-400 md:text-[17px]">
                                        This page covers how OAuth works, how to configure each AI
                                        provider, where AI features appear in the playground, and
                                        what to check when something fails.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <Link
                                        href="/auth/sign-in"
                                        className="inline-flex items-center gap-2 rounded-xl bg-[#00d4aa] px-4 py-2.5 text-[14px] font-medium text-black transition hover:brightness-110"
                                    >
                                        Get started
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                    <Link
                                        href="/dashboard"
                                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[14px] text-neutral-200 transition hover:border-[#00d4aa]/30 hover:text-white"
                                    >
                                        Open dashboard
                                    </Link>
                                </div>

                                <div className="grid gap-3 pt-2 md:grid-cols-3">
                                    {setupSteps.map((step, index) => (
                                        <MotionCard
                                            key={step}
                                            delay={0.08 * index}
                                            className="rounded-2xl border border-white/8 bg-black/12 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.18)]"
                                        >
                                            <p className="text-[11px] uppercase tracking-[0.18em] text-[#00d4aa]">
                                                Step {index + 1}
                                            </p>
                                            <p className="mt-3 text-[13px] leading-6 text-neutral-300">
                                                {step}
                                            </p>
                                        </MotionCard>
                                    ))}
                                </div>
                            </div>

                            <MotionCard className="rounded-3xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.22)]">
                                <div className="mb-4 flex items-center gap-2 text-[13px] font-medium text-white">
                                    <Sparkles className="h-4 w-4 text-[#00d4aa]" />
                                    Quick start
                                </div>
                                <div className="space-y-3 text-[14px] leading-6 text-neutral-300">
                                    <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                                        <p className="font-medium text-white">1. Sign in</p>
                                        <p className="mt-1 text-neutral-400">
                                            Use Google or GitHub on the sign-in page to unlock your
                                            personal dashboard and playgrounds.
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                                        <p className="font-medium text-white">2. Configure AI</p>
                                        <p className="mt-1 text-neutral-400">
                                            Open AI Settings inside the playground, choose a
                                            provider, add your key if needed, then test the
                                            connection.
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                                        <p className="font-medium text-white">3. Start building</p>
                                        <p className="mt-1 text-neutral-400">
                                            Use AI chat for longer requests and AI autocomplete for
                                            fast inline code suggestions inside the editor.
                                        </p>
                                    </div>
                                </div>
                            </MotionCard>
                        </section>
                    </ScrollReveal>

                    <ScrollReveal y={40}>
                        <section className="rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-6 md:p-8">
                            <div className="mb-4 flex items-center gap-2">
                                <Rocket className="h-5 w-5 text-[#00d4aa]" />
                                <h2 className="text-2xl font-semibold text-white">
                                    Start Live Preview
                                </h2>
                            </div>

                            <p className="mb-4 text-[14px] leading-6 text-neutral-400">
                                Run commands inside the playground terminal. Execute them one by one,
                                or use a chained command with &&.
                            </p>

                            <div className="mb-4 rounded-2xl border border-white/8 bg-black/10 p-4 font-mono text-[13px] text-[#d6e1ef]">
                                <p>npm install</p>
                                <p>npm run dev</p>
                            </div>

                            <div className="grid gap-3 md:grid-cols-3">
                                {previewStartCommands.map((item) => (
                                    <MotionCard
                                        key={item.template}
                                        className="rounded-2xl border border-white/8 bg-black/10 p-4"
                                    >
                                        <p className="text-[12px] uppercase tracking-[0.14em] text-[#00d4aa]">
                                            {item.template}
                                        </p>
                                        <p className="mt-3 text-[14px] leading-6 text-neutral-300">
                                            {item.command}
                                        </p>
                                    </MotionCard>
                                ))}
                            </div>
                        </section>
                    </ScrollReveal>

                    <ScrollReveal y={40}>
                        <section className="grid gap-4 md:grid-cols-3">
                            {docsHighlights.map((item, index) => {
                                const Icon = item.icon
                                return (
                                    <MotionCard
                                        key={item.title}
                                        delay={0.08 * index}
                                        className="rounded-3xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-5"
                                    >
                                        <Icon className="h-5 w-5 text-[#00d4aa]" />
                                        <h2 className="mt-4 text-lg font-semibold text-white">
                                            {item.title}
                                        </h2>
                                        <p className="mt-2 text-[14px] leading-6 text-neutral-400">
                                            {item.body}
                                        </p>
                                    </MotionCard>
                                )
                            })}
                        </section>
                    </ScrollReveal>

                    <ScrollReveal y={46} scrub>
                        <section className="rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-6 md:p-8">
                            <div className="mb-6 flex items-center gap-2">
                                <Bot className="h-5 w-5 text-[#00d4aa]" />
                                <h2 className="text-2xl font-semibold text-white">AI Providers</h2>
                            </div>
                            <div className="grid gap-4 lg:grid-cols-2">
                                {aiProviders.map((provider) => (
                                    <MotionCard
                                        key={provider.name}
                                        className="rounded-2xl border border-white/8 bg-black/10 p-4"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <h3 className="text-[16px] font-medium text-white">
                                                {provider.name}
                                            </h3>
                                            <span className="rounded-full bg-[rgba(0,212,170,0.12)] px-2.5 py-1 text-[11px] text-[#00d4aa]">
                                                {provider.model}
                                            </span>
                                        </div>
                                        <p className="mt-3 text-[13px] text-neutral-300">
                                            <span className="font-medium text-white">Key:</span>{' '}
                                            {provider.key}
                                        </p>
                                        <p className="mt-2 text-[14px] leading-6 text-neutral-400">
                                            {provider.notes}
                                        </p>
                                    </MotionCard>
                                ))}
                            </div>
                            <div className="mt-6 grid gap-4 md:grid-cols-3">
                                <MotionCard className="rounded-2xl border border-white/8 bg-black/10 p-4">
                                    <Settings className="h-4 w-4 text-[#00d4aa]" />
                                    <p className="mt-3 text-[14px] font-medium text-white">
                                        How to enable
                                    </p>
                                    <p className="mt-2 text-[13px] leading-6 text-neutral-400">
                                        In the playground, open AI Settings, pick a provider, save
                                        your key, then run the connection test.
                                    </p>
                                </MotionCard>
                                <MotionCard className="rounded-2xl border border-white/8 bg-black/10 p-4">
                                    <KeyRound className="h-4 w-4 text-[#00d4aa]" />
                                    <p className="mt-3 text-[14px] font-medium text-white">
                                        What the key does
                                    </p>
                                    <p className="mt-2 text-[13px] leading-6 text-neutral-400">
                                        Your provider key is used server-side for AI chat and inline
                                        completion requests.
                                    </p>
                                </MotionCard>
                                <MotionCard className="rounded-2xl border border-white/8 bg-black/10 p-4">
                                    <Terminal className="h-4 w-4 text-[#00d4aa]" />
                                    <p className="mt-3 text-[14px] font-medium text-white">
                                        Local dev option
                                    </p>
                                    <p className="mt-2 text-[13px] leading-6 text-neutral-400">
                                        Ollama Local only works in development and expects a
                                        reachable local Ollama server.
                                    </p>
                                </MotionCard>
                            </div>
                        </section>
                    </ScrollReveal>

                    <ScrollReveal y={44}>
                        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                            <MotionCard className="rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-6 md:p-8">
                                <div className="mb-6 flex items-center gap-2">
                                    <LogIn className="h-5 w-5 text-[#00d4aa]" />
                                    <h2 className="text-2xl font-semibold text-white">
                                        OAuth Sign-In
                                    </h2>
                                </div>
                                <div className="space-y-4">
                                    {oauthProviders.map((provider) => {
                                        const Icon = provider.icon
                                        return (
                                            <MotionCard
                                                key={provider.name}
                                                className="rounded-2xl border border-white/8 bg-black/10 p-4"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="rounded-xl bg-white/5 p-2.5">
                                                        <Icon className="h-4 w-4 text-white" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-[16px] font-medium text-white">
                                                            {provider.name}
                                                        </h3>
                                                        <p className="mt-1 text-[14px] leading-6 text-neutral-400">
                                                            {provider.notes}
                                                        </p>
                                                    </div>
                                                </div>
                                            </MotionCard>
                                        )
                                    })}
                                </div>
                            </MotionCard>

                            <MotionCard className="rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-6 md:p-8">
                                <div className="mb-6 flex items-center gap-2">
                                    <Rocket className="h-5 w-5 text-[#00d4aa]" />
                                    <h2 className="text-2xl font-semibold text-white">
                                        Best Practices
                                    </h2>
                                </div>
                                <div className="space-y-4 text-[14px] leading-6 text-neutral-400">
                                    <MotionCard className="rounded-2xl border border-white/8 bg-black/10 p-4">
                                        <p className="font-medium text-white">
                                            Use the same email when possible
                                        </p>
                                        <p className="mt-2">
                                            If you switch between Google and GitHub, using the same
                                            email makes account linking more predictable.
                                        </p>
                                    </MotionCard>
                                    <MotionCard className="rounded-2xl border border-white/8 bg-black/10 p-4">
                                        <p className="font-medium text-white">
                                            Test your AI provider right after saving
                                        </p>
                                        <p className="mt-2">
                                            If the test fails, check the key format, model choice,
                                            and provider account limits before trying again.
                                        </p>
                                    </MotionCard>
                                    <MotionCard className="rounded-2xl border border-white/8 bg-black/10 p-4">
                                        <p className="font-medium text-white">
                                            Know where AI appears
                                        </p>
                                        <p className="mt-2">
                                            Orbit Code uses your provider in the playground sidebar
                                            chat, connection tests, and inline code autocomplete.
                                        </p>
                                    </MotionCard>
                                </div>
                            </MotionCard>
                        </section>
                    </ScrollReveal>

                    <ScrollReveal y={40}>
                        <section className="rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-6 md:p-8">
                            <div className="mb-6 flex items-center gap-2">
                                <Settings className="h-5 w-5 text-[#00d4aa]" />
                                <h2 className="text-2xl font-semibold text-white">
                                    Troubleshooting
                                </h2>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <MotionCard className="rounded-2xl border border-white/8 bg-black/10 p-4">
                                    <p className="font-medium text-white">Invalid API key</p>
                                    <p className="mt-2 text-[14px] leading-6 text-neutral-400">
                                        Recheck the key format for your provider, save again, and
                                        run the connection test from AI Settings.
                                    </p>
                                </MotionCard>
                                <MotionCard className="rounded-2xl border border-white/8 bg-black/10 p-4">
                                    <p className="font-medium text-white">Model unavailable</p>
                                    <p className="mt-2 text-[14px] leading-6 text-neutral-400">
                                        Pick another model for the same provider. Some provider
                                        accounts do not expose every model tier.
                                    </p>
                                </MotionCard>
                                <MotionCard className="rounded-2xl border border-white/8 bg-black/10 p-4">
                                    <p className="font-medium text-white">
                                        Ollama local not working
                                    </p>
                                    <p className="mt-2 text-[14px] leading-6 text-neutral-400">
                                        Confirm the Ollama service is running and that
                                        `OLLAMA_BASE_URL` points at your local server.
                                    </p>
                                </MotionCard>
                                <MotionCard className="rounded-2xl border border-white/8 bg-black/10 p-4">
                                    <p className="font-medium text-white">OAuth sign-in issues</p>
                                    <p className="mt-2 text-[14px] leading-6 text-neutral-400">
                                        If the app says your account is linked to another provider,
                                        sign in with the original provider first.
                                    </p>
                                </MotionCard>
                            </div>
                        </section>
                    </ScrollReveal>

                    <ScrollReveal y={36}>
                        <section className="rounded-[32px] border border-[#00d4aa]/20 bg-[linear-gradient(135deg,rgba(0,212,170,0.12),rgba(255,255,255,0.03))] p-6 md:p-8">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="text-[13px] uppercase tracking-[0.18em] text-[#00d4aa]">
                                        Need the app?
                                    </p>
                                    <h2 className="mt-2 text-2xl font-semibold text-white">
                                        Jump from docs to the real workflow
                                    </h2>
                                    <p className="mt-2 max-w-2xl text-[14px] leading-6 text-neutral-300">
                                        Start with OAuth sign-in, then head into the dashboard and
                                        set up your AI provider inside any playground.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <Link
                                        href="/auth/sign-in"
                                        className="inline-flex items-center gap-2 rounded-xl bg-[#00d4aa] px-4 py-2.5 text-[14px] font-medium text-black transition hover:brightness-110"
                                    >
                                        Sign in now
                                    </Link>
                                    <Link
                                        href="/dashboard"
                                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[14px] text-neutral-200 transition hover:border-[#00d4aa]/30 hover:text-white"
                                    >
                                        Open dashboard
                                    </Link>
                                </div>
                            </div>
                        </section>
                    </ScrollReveal>

                    <ScrollReveal y={24}>
                        <section className="flex flex-wrap items-center gap-4 text-[13px] text-neutral-400">
                            <span>Helpful external references:</span>
                            <a
                                href="https://platform.openai.com/api-keys"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 transition hover:border-[#00d4aa]/30 hover:text-white"
                            >
                                OpenAI <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 transition hover:border-[#00d4aa]/30 hover:text-white"
                            >
                                Gemini <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            <a
                                href="https://console.anthropic.com/keys"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 transition hover:border-[#00d4aa]/30 hover:text-white"
                            >
                                Anthropic <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            <a
                                href="https://openrouter.ai/keys"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 transition hover:border-[#00d4aa]/30 hover:text-white"
                            >
                                OpenRouter <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        </section>
                    </ScrollReveal>
                </main>

                <HomeFooter />
            </div>
        </div>
    )
}

export default DocsPage
