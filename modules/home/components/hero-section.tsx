import { Chrome, Github } from 'lucide-react'
import Link from 'next/link'

export default function HeroSection() {
  return (
    <div className="flex flex-col lg:flex-row justify-between gap-16 mb-28 relative">
      <div className="flex-1">
        <p className="hero-eye text-sm uppercase tracking-[0.28em] text-neutral-500 mb-6">
          Orbit Code — A Cloud-Based Collaborative IDE
        </p>
        <h1
          className="font-bold leading-[0.9] tracking-tighter"
          style={{ fontSize: 'clamp(3.5rem, 1rem + 6.5vw, 8rem)' }}
        >
          <span
            className="hero-word hero-word-1 block text-transparent bg-clip-text"
            style={{ backgroundImage: 'linear-gradient(to bottom right, #d8e8ff, #99e6d9)' }}
          >
            Orbit.
          </span>
          <span
            className="hero-word hero-word-2 block text-transparent bg-clip-text"
            style={{ backgroundImage: 'linear-gradient(to bottom right, #b5d6ff, #4ce0cc)' }}
          >
            Code.
          </span>
          <span
            className="hero-word hero-word-3 block text-transparent bg-clip-text"
            style={{ backgroundImage: 'linear-gradient(to bottom right, #94c4ff, #00d4aa)' }}
          >
            Together.
          </span>
        </h1>
        <p className="hero-sub text-xl md:text-2xl text-neutral-200 mt-6 mb-4 max-w-xl">
          Code together, in real time, from anywhere.
        </p>
        <p className="hero-desc text-neutral-400 text-[16px] leading-[1.7] max-w-xl mb-10">
          Orbit Code is a full-stack cloud IDE for real-time collaborative development. Multiple
          developers can write, run, and debug in the browser with zero setup and zero friction.
        </p>
      </div>

      <div className="hero-aside lg:w-95 lg:pt-16 shrink-0">
        <h3 className="text-[22px] font-semibold text-white mb-4">
          Built for production-grade teams
        </h3>
        <p className="text-neutral-400 text-[16px] leading-[1.6] mb-8">
          Monaco-powered editing, Docker-sandboxed execution, and AI completions from a locally
          hosted Ollama model.
        </p>
        <ul className="space-y-4 mb-10">
          {[
            'Real-time collaboration with custom OT conflict resolution',
            'Isolated multi-language execution using Docker resource limits',
            'Async BullMQ Redis queues for execution, AI inference, and snapshots',
          ].map((item) => (
            <li key={item} className="flex items-center gap-4 text-[16px] text-neutral-200">
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: '#00d4aa' }}
              />
              {item}
            </li>
          ))}
        </ul>
        <div className=" hero-ctas flex gap-4 flex-col sm:flex-row items-center ">
          <Link
            href="/auth/sign-in"
            className="inline-flex min-h-12 px-5 py-3 rounded-xl border text-white text-[15px] font-medium hover:bg-white/5 transition-colors items-center gap-3 group"
            style={{ borderColor: '#3a3b44', backgroundColor: 'transparent' }}
          >
            <Github className="w-5 h-5 group-hover:text-[#00d4aa] transition-colors" />
            Start with Github
          </Link>
          <Link
            href="/auth/sign-in"
            className="inline-flex min-h-12 px-5 py-3 rounded-xl text-[#bff8ea] text-[15px] font-medium items-center gap-2 transition-colors hover:bg-[rgba(0,212,170,0.14)]"
            style={{
              border: '1px solid rgba(0,212,170,0.35)',
              backgroundColor: 'rgba(0,212,170,0.08)',
            }}
          >
            <Chrome className="w-5 h-5" />
            Start with Google
          </Link>
        </div>
      </div>
    </div>
  )
}
