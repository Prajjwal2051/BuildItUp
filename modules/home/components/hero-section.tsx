import { Chrome, Github } from "lucide-react";
import Link from "next/link";

// Displays the main landing message and callout to drive first-click actions.
export default function HeroSection() {
    return (
        <div className="flex flex-col lg:flex-row justify-between gap-16 mb-28">
            <div className="flex-1">
                <p className="text-sm uppercase tracking-[0.28em] text-neutral-400 mb-6">
                    Orbit Code - A Cloud-Based Collaborative IDE
                </p>
                <h1 className="text-[4rem] md:text-[6rem] lg:text-[8rem] xl:text-[9rem] font-bold leading-[0.9] tracking-tighter">
                    <span
                        className="block text-transparent bg-clip-text"
                        style={{ backgroundImage: "linear-gradient(to bottom right, #d8e8ff, #99e6d9)" }}
                    >
                        Orbit.
                    </span>
                    <span
                        className="block text-transparent bg-clip-text"
                        style={{ backgroundImage: "linear-gradient(to bottom right, #b5d6ff, #4ce0cc)" }}
                    >
                        Code.
                    </span>
                    <span
                        className="block text-transparent bg-clip-text"
                        style={{ backgroundImage: "linear-gradient(to bottom right, #94c4ff, #00d4aa)" }}
                    >
                        Together.
                    </span>
                </h1>
                <p className="text-xl md:text-2xl text-neutral-200 mt-6 mb-4 max-w-3xl">
                    Code together, in real time, from anywhere.
                </p>
                <p className="text-neutral-400 text-[16px] leading-[1.7] max-w-3xl">
                    Orbit Code is a full-stack cloud IDE for real-time collaborative development. Multiple
                    developers can write, run, and debug in the browser with zero setup and zero friction.
                </p>
            </div>

            <div className="lg:w-95 lg:pt-16 shrink-0">
                <h3 className="text-[22px] font-medium text-white mb-4">Built for production-grade teams</h3>
                <p className="text-neutral-400 text-[16px] leading-[1.6] mb-8">
                    Monaco-powered editing, Docker-sandboxed execution, and AI completions from a locally hosted
                    Ollama model.
                </p>

                <ul className="space-y-4 mb-10">
                    <li className="flex items-center gap-4 text-[16px] text-neutral-200">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#00d4aa" }} />
                        Real-time collaboration with custom OT conflict resolution
                    </li>
                    <li className="flex items-center gap-4 text-[16px] text-neutral-200">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#00d4aa" }} />
                        Isolated multi-language execution using Docker resource limits
                    </li>
                    <li className="flex items-center gap-4 text-[16px] text-neutral-200">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#00d4aa" }} />
                        Async BullMQ + Redis queues for execution, AI inference, and snapshots
                    </li>
                </ul>

                {/* Keeps both CTAs aligned in one row and wraps cleanly on small screens. */}
                <div className="flex justify-between items-stretch gap-5">
                    <Link
                        href="/auth/sign-in"
                        className="inline-flex min-h-12 px-5 py-3 rounded-xl border border-neutral-700 bg-transparent text-white text-[15px] font-medium hover:bg-neutral-800 transition-colors items-center gap-3 group"
                    >
                        <Github className="w-5 h-5 group-hover:text-[#00d4aa] transition-colors" />
                        Start with Github
                    </Link>
                    <Link
                        href="/auth/sign-in"
                        className="inline-flex min-h-12 px-5 py-3 rounded-xl border border-[#00d4aa]/40 bg-[#00d4aa]/10 text-[#bff8ea] text-[15px] font-medium hover:bg-[#00d4aa]/20 transition-colors items-center gap-2"
                    >
                        <Chrome className="w-5 h-5" />
                        Start with Google
                    </Link>
                </div>
            </div>
        </div>
    );
}
