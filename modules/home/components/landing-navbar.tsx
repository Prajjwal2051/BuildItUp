import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function LandingNavbar() {
  return (
    <header
      className="w-full sticky top-0 z-50 border-b nav-enter"
      style={{
        backgroundColor: 'rgba(20, 21, 25, 0.88)',
        borderColor: '#2a2b32',
        backdropFilter: 'blur(20px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
      }}
    >
      {/* Noise overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />
      <div className="w-full flex items-center justify-between px-6 md:px-10 h-15 max-w-360 mx-auto relative z-10">
        <div className="flex items-center gap-12 lg:gap-16">
          <a href="#home-logo" id="nav-logo" className="flex items-center gap-3 group">
            <div className="w-7 h-7 grid grid-cols-2 gap-0.75">
              <div className="bg-white rounded-tl-[5px] transition-colors group-hover:bg-[#a8d5ff]" />
              <div className="bg-white rounded-tr-[5px]" />
              <div className="bg-white rounded-bl-[5px]" />
              <div className="rounded-br-[5px]" style={{ backgroundColor: '#00d4aa' }} />
            </div>
            <span className="text-[15px] font-semibold text-white tracking-tight">Orbit Code</span>
          </a>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/auth/sign-in"
            className="text-[14px] font-medium text-neutral-400 hover:text-white transition-colors hidden md:block"
          >
            Sign In
          </Link>
          <Link
            href="/auth/sign-in"
            className="px-5 py-2 rounded-[10px] border text-white text-[14px] font-medium hover:border-white transition-colors flex items-center gap-2 group"
            style={{ borderColor: '#3a3b44' }}
          >
            Try now — it&apos;s free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
        </div>
      </div>
    </header>
  )
}
