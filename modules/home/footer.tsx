import { Github } from "lucide-react";

export default function HomeFooter() {
    return (
        <footer className="w-full max-w-360 mx-auto px-6 md:px-10 pb-0 pt-2 reveal">
            <div className="mx-auto w-full max-w-5xl rounded-t-2xl rounded-b-none border px-6 py-4 relative overflow-hidden"
                style={{ backgroundColor: "rgba(26,27,32,0.7)", borderColor: "#2a2b32", backdropFilter: "blur(8px)" }}>
                {/* Noise overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "repeat",
                        backgroundSize: "128px 128px",
                    }}
                />
                <div className="flex items-center justify-center gap-3 text-neutral-300 relative z-10">
                    <span className="text-sm tracking-wide">Built by Prajjwal Sahu</span>
                    <a href="https://github.com/Prajjwal2051" target="_blank" rel="noreferrer"
                        className="group inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs text-neutral-300 hover:text-[#00d4aa] hover:border-[rgba(0,212,170,0.4)] transition-colors"
                        style={{ borderColor: "#3a3b44" }}>
                        <Github className="h-3.5 w-3.5 transition-colors group-hover:text-[#00d4aa]" />
                        Prajjwal2051
                    </a>
                </div>
            </div>
        </footer>
    );
}