import {
    ArrowRight,
    Box,
    ChevronLeft,
    ChevronRight,
    Code2,
    GitBranch,
    MoreVertical,
    Play,
    Search,
    Sparkles,
    X,
} from "lucide-react";
import Link from "next/link";

// Renders the IDE-style preview block that demonstrates the product experience.
function EditorMockup() {
    return (
        <div className="w-full max-w-6xl mx-auto">
            <div
                className="border border-neutral-800 rounded-3xl overflow-hidden flex flex-col h-140"
                style={{
                    backgroundColor: "#090909",
                    boxShadow: "0 -45px 120px rgba(0,212,170,0.1)",
                }}
            >
                <div
                    className="h-14 border-b border-neutral-800 flex items-center justify-between px-5 shrink-0"
                    style={{ backgroundColor: "#111111" }}
                >
                    <div className="flex items-center gap-6">
                        <div className="w-5 h-5 grid grid-cols-2 gap-0.5">
                            <div className="bg-neutral-400 rounded-tl-[3px]" />
                            <div className="bg-neutral-400 rounded-tr-[3px]" />
                            <div className="bg-neutral-400 rounded-bl-[3px]" />
                            <div className="rounded-br-[3px]" style={{ backgroundColor: "#00d4aa" }} />
                        </div>

                        <div
                            className="hidden md:flex rounded-lg px-4 py-2 text-xs text-neutral-500 font-sans items-center gap-12 border border-neutral-800 w-64"
                            style={{ backgroundColor: "#1a1a1a" }}
                        >
                            Untitled Files
                            <MoreVertical className="w-3 h-3 ml-auto" />
                        </div>

                        <div className="hidden md:flex items-center gap-2 text-neutral-500">
                            <ChevronLeft className="w-4 h-4 hover:text-white cursor-pointer" />
                            <ChevronRight className="w-4 h-4 hover:text-white cursor-pointer" />
                        </div>

                        <div className="flex items-center gap-2">
                            <div
                                className="px-4 py-1.5 text-white text-xs rounded-md flex items-center gap-3"
                                style={{ backgroundColor: "#222222" }}
                            >
                                Main.html
                                <X className="w-2.5 h-2.5 text-neutral-400 hover:text-white cursor-pointer" />
                            </div>
                            <div className="px-4 py-1.5 text-neutral-500 text-xs hover:text-white cursor-pointer transition-colors hidden sm:block">
                                Packages.json
                            </div>
                            <div className="px-4 py-1.5 text-neutral-500 text-xs hover:text-white cursor-pointer transition-colors hidden sm:block">
                                Try_1.css
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Play className="w-4.5 h-4.5 text-neutral-500 hover:text-white cursor-pointer transition-colors" />
                        <Link
                            href="/auth/sign-in"
                            className="px-4 py-1.5 text-black text-xs font-bold rounded-md flex items-center gap-1 hover:bg-white transition-colors"
                            style={{ backgroundColor: "#a4f0d6" }}
                        >
                            Sign In
                            <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden" style={{ backgroundColor: "#0d0d0f" }}>
                    <div
                        className="w-14 border-r border-neutral-800 hidden sm:flex flex-col items-center py-4 gap-6 shrink-0"
                        style={{ backgroundColor: "#111111" }}
                    >
                        <div className="p-2 rounded-md text-white cursor-pointer" style={{ backgroundColor: "#222" }}>
                            <Code2 className="w-5 h-5" />
                        </div>
                        <Search className="w-5 h-5 text-neutral-600 hover:text-white cursor-pointer transition-colors" />
                        <GitBranch className="w-5 h-5 text-neutral-600 hover:text-white cursor-pointer transition-colors" />
                        <Box className="w-5 h-5 text-neutral-600 hover:text-white cursor-pointer transition-colors" />
                    </div>

                    {/* Adds a realistic file tree column to make the IDE mockup feel complete. */}
                    <div
                        className="hidden md:block w-64 lg:w-72 border-r border-neutral-800 shrink-0"
                        style={{ backgroundColor: "#101014" }}
                    >
                        <div className="h-11 border-b border-neutral-800 flex items-center px-4 text-[11px] tracking-[0.14em] uppercase text-neutral-500">
                            Explorer
                        </div>
                        <div className="p-4 font-mono text-[12px] leading-7 text-neutral-400">
                            <div className="text-neutral-500 mb-1">orbit-code</div>
                            <div className="pl-3 border-l border-neutral-800 space-y-0.5">
                                <div className="text-neutral-300">src</div>
                                <div className="pl-3 text-neutral-500">components</div>
                                <div className="pl-6 text-[#00d4aa]">Hero.tsx</div>
                                <div className="pl-6 text-neutral-500">EditorMockup.tsx</div>
                                <div className="pl-3 text-neutral-500">lib</div>
                                <div className="pl-6 text-neutral-500">ot-engine.ts</div>
                                <div className="pl-6 text-neutral-500">queue.ts</div>
                                <div className="text-neutral-300">docker</div>
                                <div className="pl-3 text-neutral-500">runner.ts</div>
                                <div className="text-neutral-300">README.md</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 relative overflow-hidden flex flex-col font-mono text-[15px]">
                        <div className="p-6 overflow-hidden flex-1 text-neutral-300 leading-[1.8]">
                            <div className="flex">
                                <div className="w-10 text-neutral-700 select-none text-right pr-5 text-xs mt-1">1</div>
                                <div className="text-neutral-500 italic text-xs mt-1">
                                    {"/* This Source Code Form is subject to the terms... */"}
                                </div>
                            </div>
                            <div className="flex">
                                <div className="w-10 text-neutral-700 select-none text-right pr-5 text-xs mt-1">2</div>
                                <div>
                                    &lt;<span style={{ color: "#00d4aa" }}>!DOCTYPE</span>{" "}
                                    <span style={{ color: "#a8d5ff" }}>html</span>&gt;
                                </div>
                            </div>
                            <div className="flex">
                                <div className="w-10 text-neutral-700 select-none text-right pr-5 text-xs mt-1">3</div>
                                <div>
                                    &lt;<span style={{ color: "#a8d5ff" }}>html</span>{" "}
                                    <span style={{ color: "#00d4aa" }}>lang</span>=
                                    <span className="text-yellow-500">&quot;en&quot;</span>&gt;
                                </div>
                            </div>
                            <div className="flex">
                                <div className="w-10 text-neutral-700 select-none text-right pr-5 text-xs mt-1">4</div>
                                <div className="pl-4">
                                    &lt;<span style={{ color: "#a8d5ff" }}>head</span>&gt;
                                </div>
                            </div>
                            <div className="flex">
                                <div className="w-10 text-neutral-700 select-none text-right pr-5 text-xs mt-1">5</div>
                                <div className="pl-8">
                                    &lt;<span style={{ color: "#a8d5ff" }}>meta</span>{" "}
                                    <span style={{ color: "#00d4aa" }}>charset</span>=
                                    <span className="text-yellow-500">&quot;UTF-8&quot;</span>&gt;
                                </div>
                            </div>
                            <div className="flex">
                                <div className="w-10 text-neutral-700 select-none text-right pr-5 text-xs mt-1">6</div>
                                <div className="pl-8">
                                    &lt;<span style={{ color: "#a8d5ff" }}>title</span>&gt;
                                    <span className="text-white">Orbit Code</span>
                                    &lt;/<span style={{ color: "#a8d5ff" }}>title</span>&gt;
                                </div>
                            </div>
                            <div className="flex">
                                <div className="w-10 text-neutral-700 select-none text-right pr-5 text-xs mt-1">7</div>
                                <div className="pl-4">
                                    &lt;/<span style={{ color: "#a8d5ff" }}>head</span>&gt;
                                </div>
                            </div>
                            <div className="flex">
                                <div className="w-10 text-neutral-700 select-none text-right pr-5 text-xs mt-1">8</div>
                                <div className="pl-4">
                                    &lt;<span style={{ color: "#a8d5ff" }}>body</span>&gt;
                                </div>
                            </div>

                            <div
                                className="ml-14 mr-6 my-5 rounded-lg overflow-hidden relative border"
                                style={{
                                    backgroundColor: "#161616",
                                    borderColor: "rgba(0,212,170,0.3)",
                                    boxShadow: "0 0 20px rgba(0,212,170,0.1)",
                                }}
                            >
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-1"
                                    style={{ backgroundColor: "#00d4aa" }}
                                />
                                <div
                                    className="px-4 py-2 border-b border-neutral-800 flex items-center justify-between"
                                    style={{ backgroundColor: "#1a1a1a" }}
                                >
                                    <div
                                        className="flex items-center gap-2 text-xs font-sans font-semibold"
                                        style={{ color: "#00d4aa" }}
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        AI Suggestion
                                    </div>
                                    <div className="text-[10px] text-neutral-500 font-sans uppercase tracking-wider">
                                        Press Tab to Accept
                                    </div>
                                </div>
                                <div className="p-4">
                                    <div className="flex items-center gap-3 mb-3 text-neutral-300 font-sans text-sm">
                                        <div
                                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                                            style={{
                                                backgroundColor: "rgba(168,213,255,0.2)",
                                                color: "#a8d5ff",
                                            }}
                                        >
                                            U
                                        </div>
                                        Generate a responsive hero section
                                    </div>
                                    <div className="font-mono text-[13px] text-neutral-400 opacity-80 border-l-2 border-neutral-800 pl-4 py-1">
                                        &lt;<span style={{ color: "#a8d5ff" }}>section</span>{" "}
                                        <span style={{ color: "#00d4aa" }}>class</span>=
                                        <span className="text-yellow-500">&quot;hero py-20&quot;</span>&gt;
                                        <br />
                                        &nbsp;&nbsp;&lt;<span style={{ color: "#a8d5ff" }}>h1</span>&gt;
                                        <span className="text-white">Code Faster.</span>
                                        &lt;/<span style={{ color: "#a8d5ff" }}>h1</span>&gt;
                                        <br />
                                        &nbsp;&nbsp;&lt;<span style={{ color: "#a8d5ff" }}>p</span>&gt;
                                        <span className="text-white">With AI assistance.</span>
                                        &lt;/<span style={{ color: "#a8d5ff" }}>p</span>&gt;
                                        <br />
                                        &lt;/<span style={{ color: "#a8d5ff" }}>section</span>&gt;
                                        <span
                                            className="inline-block w-1.5 h-4 ml-1 animate-pulse align-middle"
                                            style={{ backgroundColor: "#00d4aa" }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex">
                                <div className="w-10 text-neutral-700 select-none text-right pr-5 text-xs mt-1">15</div>
                                <div className="pl-4">
                                    &lt;/<span style={{ color: "#a8d5ff" }}>body</span>&gt;
                                </div>
                            </div>
                            <div className="flex">
                                <div className="w-10 text-neutral-700 select-none text-right pr-5 text-xs mt-1">16</div>
                                <div>
                                    &lt;/<span style={{ color: "#a8d5ff" }}>html</span>&gt;
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EditorMockup
