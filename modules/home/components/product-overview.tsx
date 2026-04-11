import { Bot, Container, Database, Users } from 'lucide-react'

const features = [
    {
        Icon: Users,
        title: 'Real-Time Collaboration',
        desc: 'Multiple users edit the same file simultaneously with conflict resolution through custom OT.',
    },
    {
        Icon: Container,
        title: 'Sandboxed Code Execution',
        desc: 'Run code in isolated Docker containers with strict resource limits and host safety.',
    },
    {
        Icon: Bot,
        title: 'AI Code Completions',
        desc: 'Inline suggestions powered by a locally-hosted LLM via Ollama integrated into Monaco.',
    },
    {
        Icon: Database,
        title: 'Version History',
        desc: 'Full-snapshot commit storage in MongoDB enables instant O(1) rollback to any point.',
    },
]

export default function ProductOverview() {
    return (
        <section id="features" className="mb-28 reveal">
            <div className="mb-10 reveal">
                <p
                    className="text-[11px] uppercase tracking-[0.22em] mb-4"
                    style={{ color: '#00d4aa' }}
                >
                    ABOUT THE PROJECT
                </p>
                <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4 tracking-tight">
                    Cloud IDE, built from scratch
                </h2>
                <p className="text-neutral-400 text-base md:text-lg leading-[1.8] max-w-4xl">
                    Build It Up combines a Monaco Editor frontend, a Node.js Socket.io backend with a
                    custom Operational Transformation engine, Docker-sandboxed multi-language
                    execution, and an AI inline completion engine powered by Ollama.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                {features.map(({ Icon, title, desc }) => (
                    <article
                        key={title}
                        className="feat-card home-feature-card rounded-xl border p-6 transition-all duration-200 cursor-default hover:border-[#2a2b36] hover:bg-[rgba(22,23,30,0.9)]"
                        style={{
                            borderColor: '#1e2028',
                            backgroundColor: 'rgba(18,19,24,0.8)',
                        }}
                    >
                        <div
                            className="home-feature-icon w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                            style={{ backgroundColor: 'rgba(0,212,170,0.1)' }}
                        >
                            <Icon className="w-4.5 h-4.5" style={{ color: '#00d4aa' }} />
                        </div>
                        <h3 className="font-semibold text-[15px] text-white mb-2">{title}</h3>
                        <p className="text-[14px] text-neutral-500 leading-[1.7]">{desc}</p>
                    </article>
                ))}
            </div>

            <div
                className="mt-8 rounded-2xl border p-6 md:p-7 reveal"
                style={{
                    borderColor: '#2a2b32',
                    background: 'linear-gradient(135deg, rgba(26,27,32,0.95), rgba(20,21,25,0.95))',
                }}
            >
                <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-600 mb-2">
                    Built for
                </p>
                <p className="text-neutral-300 text-lg leading-[1.7]">
                    Developers who want the power of VS Code, the collaboration of Figma, and the
                    safety of isolated execution - all in one browser tab.
                </p>
            </div>
        </section>
    )
}
