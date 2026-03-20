import { Bot, Clock3, Container, Database, Network, Users } from "lucide-react";

// Presents project details in a scannable layout so visitors quickly understand capabilities.
export default function ProductOverview() {
    return (
        <section id="how" className="mb-28">
            <div className="mb-10">
                <p className="text-sm uppercase tracking-[0.28em] text-neutral-500 mb-4">About the project</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">Cloud IDE, built from scratch</h2>
                <p className="text-neutral-400 text-base md:text-lg leading-8 max-w-5xl">
                    Orbit Code combines a Monaco Editor frontend, a Node.js + Socket.io backend with a custom
                    Operational Transformation engine, Docker-sandboxed multi-language execution, and an AI inline
                    completion engine powered by Ollama.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                <article className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
                    <div className="flex items-center gap-3 text-white mb-3">
                        <Users className="w-5 h-5 text-[#00d4aa]" />
                        <h3 className="font-semibold">Real-Time Collaboration</h3>
                    </div>
                    <p className="text-sm text-neutral-400 leading-6">
                        Multiple users edit the same file simultaneously with conflict resolution through custom OT.
                    </p>
                </article>

                <article className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
                    <div className="flex items-center gap-3 text-white mb-3">
                        <Container className="w-5 h-5 text-[#00d4aa]" />
                        <h3 className="font-semibold">Sandboxed Code Execution</h3>
                    </div>
                    <p className="text-sm text-neutral-400 leading-6">
                        Run code in isolated Docker containers with strict resource limits and host safety.
                    </p>
                </article>

                <article className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
                    <div className="flex items-center gap-3 text-white mb-3">
                        <Bot className="w-5 h-5 text-[#00d4aa]" />
                        <h3 className="font-semibold">AI Code Completions</h3>
                    </div>
                    <p className="text-sm text-neutral-400 leading-6">
                        Inline suggestions powered by a locally-hosted LLM via Ollama integrated into Monaco.
                    </p>
                </article>

                <article className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
                    <div className="flex items-center gap-3 text-white mb-3">
                        <Network className="w-5 h-5 text-[#00d4aa]" />
                        <h3 className="font-semibold">Async Job Queue</h3>
                    </div>
                    <p className="text-sm text-neutral-400 leading-6">
                        BullMQ + Redis queues separate execution, AI inference, and snapshots by priority.
                    </p>
                </article>

                <article className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
                    <div className="flex items-center gap-3 text-white mb-3">
                        <Database className="w-5 h-5 text-[#00d4aa]" />
                        <h3 className="font-semibold">Version History</h3>
                    </div>
                    <p className="text-sm text-neutral-400 leading-6">
                        Full-snapshot commit storage in MongoDB enables instant O(1) rollback to any point.
                    </p>
                </article>

                <article className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
                    <div className="flex items-center gap-3 text-white mb-3">
                        <Clock3 className="w-5 h-5 text-[#00d4aa]" />
                        <h3 className="font-semibold">Horizontally Scalable</h3>
                    </div>
                    <p className="text-sm text-neutral-400 leading-6">
                        Redis adapter for Socket.io and Nginx sticky sessions support multi-instance scale.
                    </p>
                </article>
            </div>

            <div className="mt-8 rounded-2xl border border-neutral-800 bg-linear-to-r from-neutral-900 to-neutral-950 p-6 md:p-7">
                <p className="text-sm uppercase tracking-[0.22em] text-neutral-500 mb-2">Built for</p>
                <p className="text-neutral-200 text-lg leading-8">
                    Developers who want the power of VS Code, the collaboration of Figma, and the safety of isolated
                    execution - all in one browser tab.
                </p>
            </div>
        </section>
    );
}
