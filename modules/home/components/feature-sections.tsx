import { ArrowRight, Sparkles, Users } from 'lucide-react'

// Adds two narrative feature sections so the landing flow matches the reference structure.
function FeatureSections() {
    return (
        <>
            <section className="mb-24 md:mb-32 reveal zf-section" id="pricing">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center zf-grid">
                    <div>
                        <p
                            className="text-[11px] uppercase tracking-[0.22em] font-medium mb-3"
                            style={{ color: '#00d4aa' }}
                        >
                            AI that works the way you code
                        </p>
                        <h2 className="text-[clamp(1.5rem,2.5vw,2.1rem)] font-semibold tracking-tight text-white mb-4">
                            Inline AI Completions
                        </h2>
                        <p className="text-[#7a7a82] text-[15.5px] leading-[1.8] mb-4">
                            Orbit Code does not lock you into one model. It gives you the fastest
                            way to collaborate with any AI agent, from local Ollama to cloud-hosted
                            LLMs.
                        </p>
                        <p className="text-[#7a7a82] text-[15.5px] leading-[1.8] mb-2">
                            Suggestions use current file context and active OT state, so output
                            stays consistent with what your teammates are writing.
                        </p>
                        <a href="#docs" className="learn-more">
                            Learn more
                            <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                    </div>

                    <div
                        className="home-detail-panel rounded-2xl border overflow-hidden"
                        style={{
                            borderColor: '#1e2028',
                            backgroundColor: 'rgba(14,15,20,0.9)',
                            boxShadow: '0 0 0 1px rgba(255,255,255,0.03)',
                        }}
                    >
                        <div className="zf-visual">
                            <div className="zf-vis-hdr">
                                <div className="zf-vis-label">
                                    <Sparkles className="w-3 h-3" />
                                    AI Suggestions
                                </div>
                                <span className="zf-badge">Active</span>
                            </div>
                            <div className="ip-box text-[#b9beca] leading-7">
                                <div className="ip-label">Edit Prediction</div>
                                <div>
                                    <span className="text-[#7fb7ff]">const</span>{' '}
                                    <span className="text-white">handleSubmit</span> ={' '}
                                    <span className="text-[#00d4aa]">async</span> () =&gt; {'{'}
                                </div>
                                <div>
                                    &nbsp;&nbsp;<span className="text-[#7fb7ff]">await</span>{' '}
                                    <span className="text-white">socket</span>.
                                    <span className="text-[#00d4aa]">emit</span>(
                                    <span className="text-[#f5c76e]">&quot;code:update&quot;</span>, {'{'}
                                </div>
                                <div>
                                    &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-white">delta</span>
                                    , <span className="text-white">revision</span>:{' '}
                                    <span className="text-[#00d4aa]">++</span>
                                    <span className="text-white">rev</span>
                                </div>
                                <div>&nbsp;&nbsp;{'}'});</div>
                                <div>
                                    {'}'};{' '}
                                    <span className="cursor-blink inline-block w-1.5 h-4 ml-1 align-middle bg-[#00d4aa]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mb-24 md:mb-32 reveal zf-section">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center zf-grid">
                    <div
                        className="home-detail-panel order-2 md:order-1 rounded-2xl border overflow-hidden"
                        style={{
                            borderColor: '#1e2028',
                            backgroundColor: 'rgba(14,15,20,0.9)',
                            boxShadow: '0 0 0 1px rgba(255,255,255,0.03)',
                        }}
                    >
                        <div className="zf-visual">
                            <div className="zf-vis-hdr">
                                <div className="zf-vis-label">
                                    <Users className="w-3 h-3" />
                                    Live Session
                                </div>
                                <span className="zf-badge">3 Active</span>
                            </div>

                            <div className="flex gap-2 mb-4">
                                <div className="w-6.5 h-6.5 rounded-full bg-[rgba(0,212,170,0.22)] text-[#00d4aa] text-[10px] font-bold flex items-center justify-center">
                                    A
                                </div>
                                <div className="w-6.5 h-6.5 rounded-full bg-[rgba(168,213,255,0.22)] text-[#a8d5ff] text-[10px] font-bold flex items-center justify-center">
                                    B
                                </div>
                                <div className="w-6.5 h-6.5 rounded-full bg-[rgba(245,199,110,0.22)] text-[#f5c76e] text-[10px] font-bold flex items-center justify-center">
                                    C
                                </div>
                                <div className="w-6.5 h-6.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[#7a7a82] text-[9px] font-bold flex items-center justify-center">
                                    +2
                                </div>
                            </div>

                            <div className="space-y-1 text-[11.5px] text-[#a8acb8]">
                                <div className="rounded-md p-1.5">
                                    <span className="text-[10px] text-[#4a4a53] mr-2">1</span>
                                    &lt;section className=&quot;editor&quot;&gt;
                                </div>
                                <div className="rounded-md p-1.5 bg-[rgba(0,212,170,0.06)]">
                                    <span className="text-[10px] text-[#4a4a53] mr-2">2</span>
                                    &lt;MonacoEditor onMount=
                                    {'{'}handleMount{'}'} /&gt;{' '}
                                    <span className="text-[#00d4aa] text-[10px]">← Alex</span>
                                </div>
                                <div className="rounded-md p-1.5 bg-[rgba(168,213,255,0.06)]">
                                    <span className="text-[10px] text-[#4a4a53] mr-2">3</span>
                                    &lt;Toolbar session={'{'}
                                    session{'}'} /&gt;{' '}
                                    <span className="text-[#a8d5ff] text-[10px]">← Ben</span>
                                </div>
                                <div className="rounded-md p-1.5">
                                    <span className="text-[10px] text-[#4a4a53] mr-2">4</span>
                                    &lt;/section&gt;
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="order-1 md:order-2">
                        <p
                            className="text-[11px] uppercase tracking-[0.22em] font-medium mb-3"
                            style={{ color: '#00d4aa' }}
                        >
                            Multiplayer by default
                        </p>
                        <h2 className="text-[clamp(1.5rem,2.5vw,2.1rem)] font-semibold tracking-tight text-white mb-4">
                            Real-Time Collaboration
                        </h2>
                        <p className="text-[#7a7a82] text-[15.5px] leading-[1.8] mb-4">
                            Share your workspace with teammates and see their cursors live. Orbit
                            Code uses a custom OT engine so edits from multiple users merge without
                            conflicts.
                        </p>
                        <p className="text-[#7a7a82] text-[15.5px] leading-[1.8] mb-2">
                            Chat, comment with threads, and see who is working on each file from the
                            same editor tab.
                        </p>
                        <a href="#docs" className="learn-more">
                            Learn more
                            <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                    </div>
                </div>
            </section>
        </>
    )
}

export default FeatureSections
