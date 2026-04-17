import Link from 'next/link'

// Keep the not-found boundary render-only to avoid Next.js dev runtime issues.
export default function NotFound() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#0a0d12] px-6 text-white">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">404</p>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight">Page not found</h1>
                <p className="mt-3 text-sm leading-6 text-white/70">
                    The page you requested does not exist or may have been moved.
                </p>
                <Link
                    href="/"
                    className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
                >
                    Return home
                </Link>
            </div>
        </main>
    )
}
