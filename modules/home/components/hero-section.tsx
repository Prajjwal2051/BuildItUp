import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { auth } from '@/auth'
import { TypewriterText } from './typewriter-text'

export default async function HeroSection() {
    const session = await auth()
    const ctaHref = session?.user ? '/dashboard' : '/auth/sign-in'

    return (
        <div className="home-hero-shell flex flex-col items-center text-center mb-0 relative ">
            <h1
                className="font-bold leading-[1.0] tracking-tighter mb-3"
                style={{ fontSize: 'clamp(3rem, 1rem + 7vw, 7rem)' }}
            >
                <span
                    className="hero-word hero-word-1 hero-gradient-flow block text-transparent bg-clip-text"
                    style={{
                        backgroundImage: 'linear-gradient(to bottom right, #1d2d2b, #1d2d2b)',
                    }}
                >
                    Orbit Code
                </span>
                <span
                    className="hero-word hero-word-2 hero-gradient-flow block text-transparent bg-clip-text"
                    style={{
                        backgroundImage: 'linear-gradient(to bottom right, #00436b, #00436b)',
                    }}
                >
                    Together.
                </span>
            </h1>

            <div className="hero-desc mb-8 py-2 flex justify-center w-full">
                <TypewriterText />
            </div>

            <div className="hero-desc mb-8 py-2 flex flex-wrap items-center justify-center gap-3 text-[13px] ">
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                    Local or hosted AI providers
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                    Multiplayer IDE with AI-native workflows
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                    Shared editing sessions
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                    In-browser execution sandbox
                </div>
            </div>

            <Link
                href={ctaHref}
                className="hero-ctas home-cta-btn inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-semibold text-black transition-all hover:brightness-110"
                style={{ backgroundColor: '#00d4aa' }}
            >
                Start Coding
                <ArrowRight className="home-cta-arrow w-4 h-4" />
            </Link>
        </div>
    )
}
