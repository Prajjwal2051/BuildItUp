import HomeFooter from '@/modules/home/footer'
import HomeHeader from '@/modules/home/header'
import EditorMockup from '../modules/home/components/editor-mockup'
import HeroSection from '@/modules/home/components/hero-section'
import FeatureSections from '@/modules/home/components/feature-sections'
import ProductOverview from '@/modules/home/components/product-overview'
import EditorGallery from '@/modules/home/components/editor-gallery'
import { SpaceBackground } from '@/modules/home/components/space-background'
import { MouseGlow } from '@/components/ui/mouse-glow'
import { FloatingOrbs, MotionCard, ScrollReveal } from '@/components/animations/scroll-effects'

const landingHighlights = [
    {
        label: 'Live editing flow',
        value: 'OT + AI',
        detail: 'Real-time collaboration layered with context-aware code generation.',
    },
    {
        label: 'Execution model',
        value: 'Sandboxed',
        detail: 'Run code in isolated environments with a calmer, safer feedback loop.',
    },
    {
        label: 'Provider freedom',
        value: '6 options',
        detail: 'Swap between local and hosted models without changing the editor flow.',
    },
]

// Composes landing sections so each part can evolve independently.
function Home() {
    return (
        <div
            className="text-white font-sans antialiased relative overflow-x-hidden"
            style={{ backgroundColor: '#0a0d12' }}
        >
            <MouseGlow />
            <SpaceBackground />

            <div className="relative z-10 flex flex-col min-h-screen">
                <HomeHeader />

                <main className="relative flex-1 w-full max-w-360 mx-auto px-6 md:px-10 pt-16 md:pt-28 pb-32">
                    <ScrollReveal y={30}>
                        <HeroSection />
                    </ScrollReveal>

                    <ScrollReveal className="mt-10 md:mt-14" y={38}>
                        <div className="grid gap-4 md:grid-cols-3">
                            {landingHighlights.map((item, index) => (
                                <MotionCard
                                    key={item.label}
                                    delay={0.08 * index}
                                    className="rounded-[24px] border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl"
                                >
                                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#4affff] font-semibold">
                                        {item.label}
                                    </p>
                                    <div className="mt-4 flex items-end justify-between gap-4">
                                        <p className="text-2xl font-semibold tracking-tight text-white">
                                            {item.value}
                                        </p>
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-white/80">
                                        {item.detail}
                                    </p>
                                </MotionCard>
                            ))}
                        </div>
                    </ScrollReveal>

                    <ScrollReveal scrub y={60}>
                        <EditorMockup />
                    </ScrollReveal>
                    <ScrollReveal y={46}>
                        <EditorGallery />
                    </ScrollReveal>
                    <ScrollReveal y={54}>
                        <ProductOverview />
                    </ScrollReveal>
                    <ScrollReveal y={54}>
                        <FeatureSections />
                    </ScrollReveal>
                </main>

                <HomeFooter />
            </div>
        </div>
    )
}

export default Home
