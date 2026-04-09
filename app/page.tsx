import HomeFooter from '@/modules/home/footer'
import HomeHeader from '@/modules/home/header'
import EditorMockup from '../modules/home/components/editor-mockup'
import HeroSection from '@/modules/home/components/hero-section'
import FeatureSections from '@/modules/home/components/feature-sections'
import ProductOverview from '@/modules/home/components/product-overview'

// Composes landing sections so each part can evolve independently.
function Home() {
    return (
        <div
            className="text-white font-sans antialiased relative overflow-x-hidden"
            style={{ backgroundColor: '#0a0d12' }}
        >
            <div
                className="fixed inset-0 pointer-events-none z-0"
                style={{
                    background: `
      radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,212,170,0.04) 0%, transparent 70%),
      radial-gradient(ellipse 100% 50% at 50% 100%, rgba(0,60,40,0.15) 0%, transparent 60%)
    `,
                }}
            />
            <div
                className="fixed inset-0 pointer-events-none z-0 bg-dot-pattern bg-dot-drift"
                style={{ opacity: 0.6 }}
            />

            <div className="relative z-10 flex flex-col min-h-screen">
                <HomeHeader />

                <main className="relative flex-1 w-full max-w-360 mx-auto px-6 md:px-10 pt-16 md:pt-28 pb-32">
                    <HeroSection />
                    <EditorMockup />
                    <ProductOverview />
                    <FeatureSections />
                </main>

                <HomeFooter />
            </div>
        </div>
    )
}

export default Home
