import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Play,
  Sparkles,
  Code2,
  Search,
  GitBranch,
  Box,
  Github,
  AtSign,
  Shapes,
  BarChart2,
  Zap,
  MoreVertical,
  X,
} from "lucide-react";
import NotificationBanner from "@/components/landing/notification-banner";

export default function Home() {
  return (
    <div
      className="text-white font-sans antialiased relative overflow-x-hidden"
      style={{ backgroundColor: "#0f0f0f" }}
    >
      {/* Dot Pattern Background */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-dot-pattern"
        style={{ opacity: 0.6 }}
      />

      <div className="relative z-10 flex flex-col min-h-screen">

        {/* Navbar */}
        <header className="w-full flex items-center justify-between px-6 md:px-10 h-24 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-12 lg:gap-16">
            {/* Logo */}
            <a href="#home-logo" id="nav-logo" className="flex items-center gap-3 group">
              <div className="w-8 h-8 grid grid-cols-2 gap-[3px]">
                <div className="bg-white rounded-tl-[6px] transition-colors group-hover:bg-[#a8d5ff]" />
                <div className="bg-white rounded-tr-[6px]" />
                <div className="bg-white rounded-bl-[6px]" />
                <div className="rounded-br-[6px]" style={{ backgroundColor: "#00d4aa" }} />
              </div>
            </a>

            {/* Nav Links */}
            <nav className="hidden lg:flex items-center gap-8 text-[15px] font-medium text-neutral-400">
              <a href="#how" className="hover:text-white transition-colors">How it works</a>
              <a href="#cases" className="hover:text-white transition-colors">Cases study</a>
              <a href="#resource" className="hover:text-white transition-colors">Resource</a>
              <a href="#docs" className="hover:text-white transition-colors">Docs</a>
              <a href="#support" className="hover:text-white transition-colors">Support</a>
              <a href="#about" className="hover:text-white transition-colors">About</a>
            </nav>
          </div>

          <div className="flex items-center gap-8">
            <a
              href="#login"
              className="text-[15px] font-medium text-neutral-400 hover:text-white transition-colors hidden md:block"
            >
              Sign In
            </a>
            <a
              href="#try"
              className="px-6 py-2.5 rounded-[10px] border border-neutral-700 text-white text-[15px] font-medium hover:border-white transition-colors flex items-center gap-2 group"
            >
              Try now its free
              <ArrowRight className="w-[18px] h-[18px] group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </header>

        {/* Notification Banner */}
        <NotificationBanner />

        {/* Main Content */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 md:px-10 pt-16 md:pt-28 pb-32">

          {/* Hero Layout */}
          <div className="flex flex-col lg:flex-row justify-between gap-16 mb-28">

            {/* Huge Typography */}
            <div className="flex-1">
              <h1 className="text-[6rem] md:text-[9rem] lg:text-[11rem] xl:text-[13rem] font-bold leading-[0.88] tracking-tighter">
                <span
                  className="block text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(to bottom right, #d8e8ff, #99e6d9)" }}
                >
                  Build.
                </span>
                <span
                  className="block text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(to bottom right, #b5d6ff, #4ce0cc)" }}
                >
                  Learn.
                </span>
                <span
                  className="block text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(to bottom right, #94c4ff, #00d4aa)" }}
                >
                  Deploy.
                </span>
              </h1>
            </div>

            {/* Callout Box */}
            <div className="lg:w-[380px] lg:pt-16 shrink-0">
              <h3 className="text-[22px] font-medium text-white mb-4">Upgrade your progress</h3>
              <p className="text-neutral-400 text-[16px] leading-[1.6] mb-8">
                Integrate code development processes to encourage collaboration and increase quality output
              </p>

              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-4 text-[16px] text-neutral-200">
                  <div className="w-[6px] h-[6px] rounded-full shrink-0" style={{ backgroundColor: "#00d4aa" }} />
                  Documentation, Backup and Recovery
                </li>
                <li className="flex items-center gap-4 text-[16px] text-neutral-200">
                  <div className="w-[6px] h-[6px] rounded-full shrink-0" style={{ backgroundColor: "#00d4aa" }} />
                  Easy Collaboration
                </li>
              </ul>

              <a
                href="#import"
                className="inline-flex px-5 py-3 rounded-xl border border-neutral-700 bg-transparent text-white text-[15px] font-medium hover:bg-neutral-800 transition-colors items-center gap-3 group"
              >
                <Github className="w-5 h-5 group-hover:text-[#00d4aa] transition-colors" />
                Import source code
              </a>
            </div>
          </div>

          {/* Trusted By Section */}
          <div className="mb-28">
            <div className="flex items-center justify-center gap-6 mb-12">
              <div className="h-px bg-neutral-800 w-8 md:w-24" />
              <span className="text-[11px] font-bold tracking-[0.25em] text-neutral-500 uppercase">
                TRUSTED BY COMPANY
              </span>
              <div className="h-px bg-neutral-800 w-8 md:w-24" />
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-between gap-10 opacity-30 hover:opacity-100 transition-opacity duration-500">
              <div className="flex items-center gap-2 font-bold text-[22px] text-neutral-300">
                <Box className="w-6 h-6" /> velocity
                <span className="bg-neutral-300 text-black px-1.5 rounded text-sm ml-1">9</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-[22px] text-neutral-300">
                <span className="w-6 h-6 border-2 border-neutral-300 rounded-full flex items-center justify-center text-xs">U</span>
                UTOSIA
              </div>
              <div className="flex items-center gap-2 font-bold text-[22px] text-neutral-300">
                <AtSign className="w-5 h-5" /> amara
              </div>
              <div className="flex items-center gap-2 font-bold text-[22px] text-neutral-300">
                <Shapes className="w-6 h-6" /> liva
              </div>
              <div className="flex items-center gap-2 font-bold text-[22px] tracking-widest text-neutral-300">
                <Zap className="w-6 h-6" /> FOX<span className="text-neutral-500 font-light">HUB</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-[22px] text-neutral-300">
                <BarChart2 className="w-5 h-5" /> goldline
              </div>
            </div>
          </div>

          {/* Editor Mockup */}
          <div className="max-w-4xl mx-auto">
            <div
              className="border-x border-t border-neutral-800 rounded-t-3xl overflow-hidden flex flex-col h-[400px]"
              style={{
                backgroundColor: "#090909",
                boxShadow: "0 -20px 50px rgba(0,212,170,0.05)",
              }}
            >
              {/* Editor Header */}
              <div
                className="h-14 border-b border-neutral-800 flex items-center justify-between px-5 shrink-0"
                style={{ backgroundColor: "#111111" }}
              >
                <div className="flex items-center gap-6">
                  {/* Mini Logo */}
                  <div className="w-5 h-5 grid grid-cols-2 gap-[2px]">
                    <div className="bg-neutral-400 rounded-tl-[3px]" />
                    <div className="bg-neutral-400 rounded-tr-[3px]" />
                    <div className="bg-neutral-400 rounded-bl-[3px]" />
                    <div className="rounded-br-[3px]" style={{ backgroundColor: "#00d4aa" }} />
                  </div>

                  {/* Search/Title bar */}
                  <div
                    className="hidden md:flex rounded-lg px-4 py-2 text-xs text-neutral-500 font-sans items-center gap-12 border border-neutral-800 w-64"
                    style={{ backgroundColor: "#1a1a1a" }}
                  >
                    Untitled Files
                    <MoreVertical className="w-3 h-3 ml-auto" />
                  </div>

                  {/* Nav arrows */}
                  <div className="hidden md:flex items-center gap-2 text-neutral-500">
                    <ChevronLeft className="w-4 h-4 hover:text-white cursor-pointer" />
                    <ChevronRight className="w-4 h-4 hover:text-white cursor-pointer" />
                  </div>

                  {/* Tabs */}
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
                  <Play className="w-[18px] h-[18px] text-neutral-500 hover:text-white cursor-pointer transition-colors" />
                  <a
                    href="#sign-in-editor"
                    className="px-4 py-1.5 text-black text-xs font-bold rounded-md flex items-center gap-1 hover:bg-white transition-colors"
                    style={{ backgroundColor: "#a4f0d6" }}
                  >
                    Sign In
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Editor Body */}
              <div
                className="flex flex-1 overflow-hidden"
                style={{ backgroundColor: "#0d0d0f" }}
              >
                {/* Sidebar */}
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

                {/* Code Area */}
                <div className="flex-1 relative overflow-hidden flex flex-col font-mono text-[14px] editor-scroll">
                  <div className="p-6 overflow-y-auto flex-1 text-neutral-300 leading-[1.8]">
                    {/* Line 1 */}
                    <div className="flex">
                      <div className="w-10 text-neutral-700 select-none text-right pr-5 text-xs mt-1">1</div>
                      <div className="text-neutral-500 italic text-xs mt-1">{"/* This Source Code Form is subject to the terms... */"}</div>
                    </div>
                    {/* Line 2 */}
                    <div className="flex">
                      <div className="w-10 text-neutral-700 select-none text-right pr-5 text-xs mt-1">2</div>
                      <div>
                        &lt;<span style={{ color: "#00d4aa" }}>!DOCTYPE</span>{" "}
                        <span style={{ color: "#a8d5ff" }}>html</span>&gt;
                      </div>
                    </div>
                    {/* Line 3 */}
                    <div className="flex">
                      <div className="w-10 text-neutral-700 select-none text-right pr-5 text-xs mt-1">3</div>
                      <div>
                        &lt;<span style={{ color: "#a8d5ff" }}>html</span>{" "}
                        <span style={{ color: "#00d4aa" }}>lang</span>=
                        <span className="text-yellow-500">&quot;en&quot;</span>&gt;
                      </div>
                    </div>
                    {/* Line 4 */}
                    <div className="flex">
                      <div className="w-10 text-neutral-700 select-none text-right pr-5 text-xs mt-1">4</div>
                      <div className="pl-4">
                        &lt;<span style={{ color: "#a8d5ff" }}>head</span>&gt;
                      </div>
                    </div>
                    {/* Line 5 */}
                    <div className="flex">
                      <div className="w-10 text-neutral-700 select-none text-right pr-5 text-xs mt-1">5</div>
                      <div className="pl-8">
                        &lt;<span style={{ color: "#a8d5ff" }}>meta</span>{" "}
                        <span style={{ color: "#00d4aa" }}>charset</span>=
                        <span className="text-yellow-500">&quot;UTF-8&quot;</span>&gt;
                      </div>
                    </div>
                    {/* Line 6 */}
                    <div className="flex">
                      <div className="w-10 text-neutral-700 select-none text-right pr-5 text-xs mt-1">6</div>
                      <div className="pl-8">
                        &lt;<span style={{ color: "#a8d5ff" }}>title</span>&gt;
                        <span className="text-white">Build It Up</span>
                        &lt;/<span style={{ color: "#a8d5ff" }}>title</span>&gt;
                      </div>
                    </div>
                    {/* Line 7 */}
                    <div className="flex">
                      <div className="w-10 text-neutral-700 select-none text-right pr-5 text-xs mt-1">7</div>
                      <div className="pl-4">
                        &lt;/<span style={{ color: "#a8d5ff" }}>head</span>&gt;
                      </div>
                    </div>
                    {/* Line 8 */}
                    <div className="flex">
                      <div className="w-10 text-neutral-700 select-none text-right pr-5 text-xs mt-1">8</div>
                      <div className="pl-4">
                        &lt;<span style={{ color: "#a8d5ff" }}>body</span>&gt;
                      </div>
                    </div>

                    {/* AI Suggestion Popover */}
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
                        <div
                          className="font-mono text-[13px] text-neutral-400 opacity-80 border-l-2 border-neutral-800 pl-4 py-1"
                        >
                          &lt;<span style={{ color: "#a8d5ff" }}>section</span>{" "}
                          <span style={{ color: "#00d4aa" }}>class</span>=
                          <span className="text-yellow-500">&quot;hero py-20&quot;</span>&gt;<br />
                          &nbsp;&nbsp;&lt;<span style={{ color: "#a8d5ff" }}>h1</span>&gt;
                          <span className="text-white">Code Faster.</span>
                          &lt;/<span style={{ color: "#a8d5ff" }}>h1</span>&gt;<br />
                          &nbsp;&nbsp;&lt;<span style={{ color: "#a8d5ff" }}>p</span>&gt;
                          <span className="text-white">With AI assistance.</span>
                          &lt;/<span style={{ color: "#a8d5ff" }}>p</span>&gt;<br />
                          &lt;/<span style={{ color: "#a8d5ff" }}>section</span>&gt;
                          <span
                            className="inline-block w-1.5 h-4 ml-1 animate-pulse align-middle"
                            style={{ backgroundColor: "#00d4aa" }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Line 15 */}
                    <div className="flex">
                      <div className="w-10 text-neutral-700 select-none text-right pr-5 text-xs mt-1">15</div>
                      <div className="pl-4">
                        &lt;/<span style={{ color: "#a8d5ff" }}>body</span>&gt;
                      </div>
                    </div>
                    {/* Line 16 */}
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

        </main>
      </div>
    </div>
  );
}

