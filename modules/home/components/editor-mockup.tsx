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

// Shows a multi-view editor mockup so visitors can quickly see Orbit's editing, collaboration, and AI flow.
function EditorMockup() {
    return (
        <div className="w-full max-w-6xl mx-auto editor-fade-in mb-24" id="docs">
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
                            orbit-code
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
                                Main.tsx
                                <X className="w-2.5 h-2.5 text-neutral-400 hover:text-white cursor-pointer" />
                            </div>
                            <div className="px-4 py-1.5 text-neutral-500 text-xs hidden sm:block">Queue.ts</div>
                            <div className="px-4 py-1.5 text-neutral-500 text-xs hidden sm:block">OtEngine.ts</div>
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
                            </div>
                        </div>
                    </div>

                    {/* Rotates through three editor snapshots using CSS timing so the preview feels dynamic. */}
                    <div className="editor-views relative flex-1 overflow-hidden p-6 font-mono text-[13px] leading-7 text-neutral-300">
                        <div className="p-6 editor-view editor-view-1 ">
                            <div className="text-neutral-500 italic text-xs mb-3">// AI generated block</div>
                            <div>&lt;<span className="text-[#a8d5ff]">section</span> <span className="text-[#00d4aa]">className</span>=<span className="text-yellow-500">&quot;hero py-20&quot;</span>&gt;</div>
                            <div className="pl-5">&lt;<span className="text-[#a8d5ff]">h1</span>&gt;<span className="text-white">Code Faster.</span>&lt;/<span className="text-[#a8d5ff]">h1</span>&gt;</div>
                            <div className="pl-5">&lt;<span className="text-[#a8d5ff]">p</span>&gt;<span className="text-white">With AI assistance.</span>&lt;/<span className="text-[#a8d5ff]">p</span>&gt;</div>
                            <div>&lt;/<span className="text-[#a8d5ff]">section</span>&gt;</div>

                            <div className="mt-6 rounded-lg overflow-hidden relative border border-[rgba(0,212,170,0.3)] bg-[#161616]">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00d4aa]" />
                                <div className="px-4 py-2 border-b border-neutral-800 flex items-center justify-between bg-[#1a1a1a]">
                                    <div className="flex items-center gap-2 text-xs font-sans font-semibold text-[#00d4aa]">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        AI Suggestion
                                    </div>
                                    <div className="text-[10px] text-neutral-500 font-sans uppercase tracking-wider">Press Tab to Accept</div>
                                </div>
                                <div className="p-4 text-neutral-400">
                                    queue.add("execute", payload)
                                    <span className="cursor-blink inline-block w-1.5 h-4 ml-1 align-middle bg-[#00d4aa]" />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 editor-view editor-view-2">
                            <div className="text-neutral-500 italic text-xs mb-3">// collaborative session snapshot</div>
                            <div><span className="text-[#7fb7ff]">const</span> room = <span className="text-yellow-500">&quot;builditup&quot;</span></div>
                            <div><span className="text-[#7fb7ff]">await</span> socket.<span className="text-[#00d4aa]">join</span>(room)</div>
                            <div><span className="text-[#7fb7ff]">const</span> delta = otEngine.<span className="text-[#00d4aa]">compose</span>(changes)</div>
                            <div><span className="text-[#7fb7ff]">queue</span>.<span className="text-[#00d4aa]">add</span>(<span className="text-yellow-500">&quot;execute&quot;</span>, payload)</div>
                            <div className="mt-4 rounded-md border border-[#2a2b32] bg-[rgba(0,212,170,0.08)] px-3 py-2 text-[12px] text-[#9fd3c8]">
                                3 collaborators syncing at 18ms latency
                            </div>
                        </div>

                        <div className="p-6 editor-view editor-view-3">
                            <div className="text-neutral-500 italic text-xs mb-3">// execution pipeline</div>
                            <div><span className="text-[#7fb7ff]">jobQueue</span>.<span className="text-[#00d4aa]">process</span>(<span className="text-yellow-500">&quot;execute&quot;</span>, worker)</div>
                            <div><span className="text-[#7fb7ff]">docker</span>.<span className="text-[#00d4aa]">run</span>(sandboxConfig)</div>
                            <div><span className="text-[#7fb7ff]">result</span>.<span className="text-[#00d4aa]">streamToClient</span>(sessionId)</div>
                            <div className="mt-4 text-[12px] text-neutral-400">
                                status: <span className="text-[#00d4aa]">healthy</span>
                                <span className="cursor-blink inline-block w-1.5 h-4 ml-1 align-middle bg-[#00d4aa]" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EditorMockup;