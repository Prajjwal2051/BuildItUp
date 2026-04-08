export default function HomeFooter() {
    return (
        <footer
            className="border-t py-8 px-6 md:px-10"
            style={{ borderColor: '#1e2028', backgroundColor: '#080b0f' }}
        >
            <div className="max-w-360 mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 grid grid-cols-2 gap-0.5">
                        <div className="bg-white rounded-tl-[4px]" />
                        <div className="bg-white rounded-tr-[4px]" />
                        <div className="bg-white rounded-bl-[4px]" />
                        <div className="rounded-br-[4px]" style={{ backgroundColor: '#00d4aa' }} />
                    </div>
                    <span className="text-[14px] font-semibold text-white">Orbit Code</span>
                </div>

                <div className="flex flex-col items-center md:items-end gap-2 text-center md:text-right">
                    <p className="text-[13px] text-neutral-400">
                        Crafted with <span className="text-white">love</span> by{' '}
                        <span className="font-semibold text-white">Prajjwal Sahu</span>
                    </p>

                    <a
                        href="https://github.com/Prajjwal2051"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="home-footer-link inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[13px] text-neutral-300 shadow-sm transition-all duration-300 hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-white hover:shadow-[0_0_24px_rgba(16,185,129,0.15)]"
                    >
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        GitHub: @Prajjwal2051
                    </a>
                </div>


            </div>
        </footer>
    )
}
