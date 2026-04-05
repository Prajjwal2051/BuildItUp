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
      style={{ backgroundColor: '#0f0f0f' }}
    >
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-dot-pattern bg-dot-drift"
        style={{ opacity: 0.6 }}
      />
      <div className="pointer-events-none fixed -top-28 -left-16 z-0 h-96 w-96 rounded-full orbit-blob-a" />
      <div className="pointer-events-none fixed top-1/3 -right-24 z-0 h-120 w-120 rounded-full orbit-blob-b" />

      <div className="relative z-10 flex flex-col min-h-screen">
        <HomeHeader />

        <main className="relative flex-1 w-full max-w-360 mx-auto px-6 md:px-10 pt-16 md:pt-28 pb-32">
          <HeroSection />
          <div className="hero-glow" />
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
