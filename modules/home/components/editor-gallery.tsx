import { Bot, GitBranch, Layers3, TerminalSquare } from 'lucide-react'
import { MotionCard } from '@/components/animations/scroll-effects'

const editorCards = [
    {
        title: 'AI Chat Pane',
        subtitle: 'Long-form prompting beside the editor',
        icon: Bot,
        accent: '#00d4aa',
        glow: 'rgba(0,212,170,0.22)',
        lines: [
            '> generate a reusable auth guard',
            'thinking... provider context loaded',
            'created middleware.ts with route matchers',
            'suggested tests for redirect coverage',
        ],
    },
    {
        title: 'Branch Review',
        subtitle: 'Source control snapshots without leaving flow',
        icon: GitBranch,
        accent: '#7fb7ff',
        glow: 'rgba(127,183,255,0.2)',
        lines: [
            'feat/dashboard-motion',
            '+ add command-center stats',
            '+ animate search results modal',
            '+ tune docs reveal timing',
        ],
    },
    {
        title: 'Runtime Console',
        subtitle: 'Execution feedback and logs in one glance',
        icon: TerminalSquare,
        accent: '#f5c76e',
        glow: 'rgba(245,199,110,0.18)',
        lines: [
            '$ npm run dev',
            'ready on http://localhost:3000',
            'compiled home page in 614ms',
            'watching for file changes...',
        ],
    },
]

function EditorGallery() {
    return (
        <section className="relative mb-24 mt-10">
            <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#00d4aa]">
                        More editor views
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                        Multiple code editor scenes on one page
                    </h2>
                </div>
                <p className="max-w-xl text-sm leading-7 text-neutral-400 md:text-[15px]">
                    These extra editor frames make the homepage feel more like a living product
                    walkthrough, with AI, source control, and runtime feedback all in motion.
                </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                <MotionCard
                    className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,20,24,0.96),rgba(12,14,18,0.92))] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.28)]"
                >
                    <div
                        data-parallax="1.4"
                        className="pointer-events-none absolute -left-12 top-8 h-32 w-32 rounded-full blur-3xl"
                        style={{ background: 'rgba(0,212,170,0.16)' }}
                    />
                    <div
                        data-parallax="1.8"
                        className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full blur-3xl"
                        style={{ background: 'rgba(127,183,255,0.14)' }}
                    />
                    <div className="relative overflow-hidden rounded-[24px] border border-white/8 bg-[#0d1117]">
                        <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
                            <div className="flex gap-1.5">
                                <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                                <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
                                <div className="h-3 w-3 rounded-full bg-[#28c840]" />
                            </div>
                            <div className="rounded-full border border-white/8 bg-white/4 px-3 py-1 text-[11px] text-neutral-500">
                                /workspace/ui/home.tsx
                            </div>
                        </div>

                        <div className="grid min-h-[20rem] lg:grid-cols-[220px_1fr]">
                            <div className="border-r border-white/8 bg-[#0b0f14] p-4 text-[12px] text-neutral-500">
                                <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-neutral-400">
                                    <Layers3 className="h-3.5 w-3.5 text-[#00d4aa]" />
                                    Explorer
                                </div>
                                <div className="space-y-2">
                                    <div>app</div>
                                    <div className="pl-3 text-neutral-400">home</div>
                                    <div className="pl-6 text-[#00d4aa]">editor-gallery.tsx</div>
                                    <div className="pl-6">hero-section.tsx</div>
                                    <div className="pl-3 text-neutral-400">docs</div>
                                    <div className="pl-6">page.tsx</div>
                                    <div className="pl-3 text-neutral-400">dashboard</div>
                                    <div className="pl-6">page.tsx</div>
                                </div>
                            </div>

                            <div className="relative p-5 font-mono text-[13px] leading-7 text-neutral-300">
                                <div data-parallax="0.8" className="mb-5 rounded-2xl border border-[#00d4aa]/20 bg-[#101820] px-4 py-3">
                                    <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[#00d4aa]">
                                        active suggestion
                                    </div>
                                    <div>
                                        const revealSequence = gsap.timeline(&#40;&#123; defaults:
                                        &#123; ease: &quot;power3.out&quot; &#125; &#125;&#41;
                                    </div>
                                    <div className="pl-4">
                                        .from&#40;&quot;.editor-shot&quot;, &#123; y: 40, opacity: 0 &#125;&#41;
                                    </div>
                                    <div className="pl-4">
                                        .from&#40;&quot;.editor-badge&quot;, &#123; scale: 0.9 &#125;&#41;
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div>
                                        export function <span className="text-[#7fb7ff]">EditorGallery</span>
                                        &#40;&#41; &#123;
                                    </div>
                                    <div className="pl-4">
                                        return <span className="text-[#f5c76e]">&lt;section&gt;</span>
                                    </div>
                                    <div className="pl-8">
                                        <span className="text-[#f5c76e]">&lt;MotionCard</span> className=
                                        <span className="text-[#00d4aa]">&quot;editor-shot&quot;</span>
                                        <span className="text-[#f5c76e]">&gt;</span>
                                    </div>
                                    <div className="pl-12 text-neutral-400">
                                        richer previews for home page storytelling
                                    </div>
                                    <div className="pl-8">
                                        <span className="text-[#f5c76e]">&lt;/MotionCard&gt;</span>
                                    </div>
                                    <div className="pl-4">
                                        <span className="text-[#f5c76e]">&lt;/section&gt;</span>
                                    </div>
                                    <div>&#125;</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </MotionCard>

                <div className="grid gap-5">
                    {editorCards.map((card, index) => {
                        const Icon = card.icon
                        return (
                            <MotionCard
                                key={card.title}
                                delay={0.07 * index}
                                className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,20,24,0.95),rgba(12,15,19,0.9))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
                            >
                                <div
                                    data-parallax={String(1 + index * 0.3)}
                                    className="pointer-events-none absolute -right-8 top-0 h-24 w-24 rounded-full blur-3xl"
                                    style={{ background: card.glow }}
                                />
                                <div className="relative">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-white">
                                                {card.title}
                                            </p>
                                            <p className="mt-1 text-[13px] text-neutral-400">
                                                {card.subtitle}
                                            </p>
                                        </div>
                                        <div
                                            className="rounded-2xl border p-2.5"
                                            style={{
                                                borderColor: `${card.accent}33`,
                                                backgroundColor: `${card.accent}14`,
                                            }}
                                        >
                                            <Icon className="h-4 w-4" style={{ color: card.accent }} />
                                        </div>
                                    </div>

                                    <div className="rounded-[22px] border border-white/8 bg-[#0d1117] p-4 font-mono text-[12px] leading-7 text-neutral-300">
                                        <div className="mb-3 flex items-center gap-2">
                                            <span
                                                className="h-2.5 w-2.5 rounded-full"
                                                style={{ backgroundColor: card.accent }}
                                            />
                                            <span className="text-neutral-500">session-preview.ts</span>
                                        </div>
                                        {card.lines.map((line) => (
                                            <div key={line}>{line}</div>
                                        ))}
                                    </div>
                                </div>
                            </MotionCard>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}

export default EditorGallery
