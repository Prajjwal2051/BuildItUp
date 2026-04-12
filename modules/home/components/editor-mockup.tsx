import { Box, Code2, GitBranch, Search, Sparkles } from 'lucide-react'

// Shows a multi-view editor mockup so visitors can quickly see Orbit's editing, collaboration, and AI flow.
function EditorMockup() {
    return (
        <section className="width-full relative mb-20 mt-16 reveal editor-fade-in" id="docs">
            <div
                className="editor-atmosphere absolute inset-x-0 bottom-0 h-[60%] pointer-events-none z-0 "
                style={{
                    background:
                        'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(0,212,170,0.12) 0%, rgba(0,100,80,0.06) 50%, transparent 100%)',
                }}
            />
            <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90vw] max-w-4xl h-64 pointer-events-none z-0 rounded-t-[50%]"
                style={{
                    background:
                        'radial-gradient(ellipse at 50% 100%, #0a3d2e 0%, #061f17 40%, #02100c 70%, transparent 100%)',
                    boxShadow: '0 0 120px 40px rgba(0,212,170,0.07)',
                }}
            />

            <div
                className="home-editor-shell relative z-10 rounded-2xl overflow-hidden border mx-auto flex flex-col h-150"
                style={{
                    borderColor: '#2a2b32',
                    backgroundColor: '#13141a',
                    maxHeight: '1000px',
                    maxWidth: '1100px',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
                }}
            >
                <div
                    className="flex items-center gap-3 px-4 h-10 border-b shrink-0"
                    style={{ backgroundColor: '#1a1b22', borderColor: '#2a2b32' }}
                >
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                        <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                        <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                    </div>

                    <div
                        className="flex-1 mx-4 h-6 rounded-md flex items-center justify-center text-[11px] text-neutral-500 border"
                        style={{ backgroundColor: '#0f1015', borderColor: '#2a2b32' }}
                    >
                        ✦ orbit.code/workspace
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden" style={{ backgroundColor: '#0d0d0f' }}>
                    <div
                        className="w-14 border-r border-neutral-800 hidden sm:flex flex-col items-center py-4 gap-6 shrink-0"
                        style={{ backgroundColor: '#111111' }}
                    >
                        <div
                            className="home-editor-icon p-2 rounded-md text-white cursor-pointer"
                            style={{ backgroundColor: '#222' }}
                        >
                            <Code2 className="w-5 h-5" />
                        </div>
                        <Search className="w-5 h-5 text-neutral-600 hover:text-white cursor-pointer transition-colors" />
                        <GitBranch className="w-5 h-5 text-neutral-600 hover:text-white cursor-pointer transition-colors" />
                        <Box className="w-5 h-5 text-neutral-600 hover:text-white cursor-pointer transition-colors" />
                    </div>

                    <div
                        className="hidden md:block w-64 lg:w-72 border-r shrink-0"
                        style={{ backgroundColor: '#101014', borderColor: '#2a2b32' }}
                    >
                        <div
                            className="h-11 border-b flex items-center px-4 text-[11px] tracking-[0.14em] uppercase text-neutral-500"
                            style={{ borderColor: '#2a2b32' }}
                        >
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

                    <div className="editor-views relative flex-1 overflow-hidden p-6 font-mono text-[13px] leading-7 text-neutral-300">
                        <div className="p-6 editor-view editor-view-1">
                            <div className="text-neutral-500 italic text-xs mb-3">
                                {'// AI generated block'}
                            </div>
                            <div>
                                &lt;<span className="text-[#a8d5ff]">section</span>{' '}
                                <span className="text-[#00d4aa]">className</span>=
                                <span className="text-yellow-500">&quot;hero py-20&quot;</span>&gt;
                            </div>
                            <div className="pl-5">
                                &lt;<span className="text-[#a8d5ff]">h1</span>&gt;
                                <span className="text-white">Code Faster.</span>&lt;/
                                <span className="text-[#a8d5ff]">h1</span>&gt;
                            </div>
                            <div className="pl-5">
                                &lt;<span className="text-[#a8d5ff]">p</span>&gt;
                                <span className="text-white">With AI assistance.</span>&lt;/
                                <span className="text-[#a8d5ff]">p</span>&gt;
                            </div>
                            <div>
                                &lt;/<span className="text-[#a8d5ff]">section</span>&gt;
                            </div>

                            <div className="mt-6 rounded-lg overflow-hidden relative border border-[rgba(0,212,170,0.3)] bg-[#161616]">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00d4aa]" />
                                <div className="px-4 py-2 border-b border-neutral-800 flex items-center justify-between bg-[#1a1a1a]">
                                    <div className="flex items-center gap-2 text-xs font-sans font-semibold text-[#00d4aa]">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        AI Suggestion
                                    </div>
                                    <div className="text-[10px] text-neutral-500 font-sans uppercase tracking-wider">
                                        Press Tab to Accept
                                    </div>
                                </div>
                                <div className="p-4 text-neutral-400">
                                    queue.add(&quot;execute&quot;, payload)
                                    <span className="cursor-blink inline-block w-1.5 h-4 ml-1 align-middle bg-[#00d4aa]" />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 editor-view editor-view-2">
                            <div className="text-neutral-500 italic text-xs mb-3">
                                {'// collaborative session snapshot'}
                            </div>
                            <div>
                                <span className="text-[#7fb7ff]">const</span> room ={' '}
                                <span className="text-yellow-500">&quot;orbitcode&quot;</span>
                            </div>
                            <div>
                                <span className="text-[#7fb7ff]">await</span> socket.
                                <span className="text-[#00d4aa]">join</span>(room)
                            </div>
                            <div>
                                <span className="text-[#7fb7ff]">const</span> delta = otEngine.
                                <span className="text-[#00d4aa]">compose</span>(changes)
                            </div>
                            <div>
                                <span className="text-[#7fb7ff]">queue</span>.
                                <span className="text-[#00d4aa]">add</span>(
                                <span className="text-yellow-500">&quot;execute&quot;</span>,
                                payload)
                            </div>
                            <div className="mt-4 rounded-md border border-[#2a2b32] bg-[rgba(0,212,170,0.08)] px-3 py-2 text-[12px] text-[#9fd3c8]">
                                3 collaborators syncing at 18ms latency
                            </div>
                        </div>

                        <div className="p-6 editor-view editor-view-3">
                            <div className="text-neutral-500 italic text-xs mb-3">
                                {'// execution pipeline'}
                            </div>
                            <div>
                                <span className="text-[#7fb7ff]">jobQueue</span>.
                                <span className="text-[#00d4aa]">process</span>(
                                <span className="text-yellow-500">&quot;execute&quot;</span>,
                                worker)
                            </div>
                            <div>
                                <span className="text-[#7fb7ff]">docker</span>.
                                <span className="text-[#00d4aa]">run</span>(sandboxConfig)
                            </div>
                            <div>
                                <span className="text-[#7fb7ff]">result</span>.
                                <span className="text-[#00d4aa]">streamToClient</span>(sessionId)
                            </div>
                            <div className="mt-4 text-[12px] text-neutral-400">
                                status: <span className="text-[#00d4aa]">healthy</span>
                                <span className="cursor-blink inline-block w-1.5 h-4 ml-1 align-middle bg-[#00d4aa]" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default EditorMockup
