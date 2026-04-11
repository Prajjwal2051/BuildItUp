import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function HeroSection() {
    return (
        <div className="home-hero-shell flex flex-col items-center text-center mb-0 relative ">
            <h1
                className="font-bold leading-[1.0] tracking-tighter mb-6"
                style={{ fontSize: 'clamp(3rem, 1rem + 7vw, 7rem)' }}
            >
                <span
                    className="hero-word hero-word-1 hero-gradient-flow block text-transparent bg-clip-text"
                    style={{ backgroundImage: 'linear-gradient(to bottom right, #d8e8ff, #1f3432)' }}
                >
                    Build It Up
                </span>
                <span
                    className="hero-word hero-word-2 hero-gradient-flow block text-transparent bg-clip-text"
                    style={{ backgroundImage: 'linear-gradient(to bottom right, #94c4ff, #005e7b)' }}
                >
                    Together.
                </span>
            </h1>

            <p className="hero-desc text-neutral-400 text-[17px] leading-[1.7] max-w-xl mb-8">
                The cloud-based collaborative IDE for real-time development.
                <br />
                Code, run, and debug together from any browser.
            </p>

            <Link
                href="/auth/sign-in"
                className="hero-ctas home-cta-btn inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-semibold text-black transition-all hover:brightness-110"
                style={{ backgroundColor: '#00d4aa' }}
            >
                Start Coding
                <ArrowRight className="home-cta-arrow w-4 h-4" />
            </Link>
        </div>
    )
}
