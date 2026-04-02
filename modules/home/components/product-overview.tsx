import { Bot, Clock3, Container, Database, Network, Users } from "lucide-react";

const features = [
    { Icon: Users, title: "Real-Time Collaboration", desc: "Multiple users edit the same file simultaneously with conflict resolution through custom OT." },
    { Icon: Container, title: "Sandboxed Code Execution", desc: "Run code in isolated Docker containers with strict resource limits and host safety." },
    { Icon: Bot, title: "AI Code Completions", desc: "Inline suggestions powered by a locally-hosted LLM via Ollama integrated into Monaco." },
    { Icon: Network, title: "Async Job Queue", desc: "BullMQ Redis queues separate execution, AI inference, and snapshots by priority." },
    { Icon: Database, title: "Version History", desc: "Full-snapshot commit storage in MongoDB enables instant O(1) rollback to any point." },
    { Icon: Clock3, title: "Horizontally Scalable", desc: "Redis adapter for Socket.io and Nginx sticky sessions support multi-instance scale." },
];

export default function ProductOverview() {
    return (
        <section id="how" className="mb-28 reveal">
            <div className="mb-10 reveal">
                <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-600 mb-4">About the project</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4 tracking-tight">
                    Cloud IDE, built from scratch
                </h2>
                <p className="text-neutral-400 text-base md:text-lg leading-[1.8] max-w-4xl">
                    Orbit Code combines a Monaco Editor frontend, a Node.js Socket.io backend with a custom
                    Operational Transformation engine, Docker-sandboxed multi-language execution, and an AI
                    inline completion engine powered by Ollama.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                {features.map(({ Icon, title, desc }) => (
                    <article key={title}
                        className="feat-card rounded-2xl border p-5 transition-colors duration-200 cursor-default border-[#2a2b32] bg-[rgba(26,27,32,0.6)] hover:border-[#3a3b44] hover:bg-[rgba(30,31,38,0.8)]"
                    >
                        <div className="flex items-center gap-3 text-white mb-3">
                            <Icon className="w-4.5 h-4.5" style={{ color: "#00d4aa" }} />
                            <h3 className="font-semibold text-[14px]">{title}</h3>
                        </div>
                        <p className="text-sm text-neutral-400 leading-[1.65]">{desc}</p>
                    </article>
                ))}
            </div>

            <div className="mt-8 rounded-2xl border p-6 md:p-7 reveal"
                style={{ borderColor: "#2a2b32", background: "linear-gradient(135deg, rgba(26,27,32,0.95), rgba(20,21,25,0.95))" }}>
                <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-600 mb-2">Built for</p>
                <p className="text-neutral-300 text-lg leading-[1.7]">
                    Developers who want the power of VS Code, the collaboration of Figma, and the safety
                    of isolated execution — all in one browser tab.
                </p>
            </div>
        </section>
    );
}