import { ArrowRight } from "lucide-react";
import Link from "next/link";

// Renders the landing navigation so page routing code stays minimal.
function LandingNavbar() {
    return (
        <header className="w-full flex items-center justify-between px-6 md:px-10 h-24 max-w-360 mx-auto">
            <div className="flex items-center gap-12 lg:gap-16">
                <a href="#home-logo" id="nav-logo" className="flex items-center gap-3 group">
                    <div className="w-8 h-8 grid grid-cols-2 gap-0.75">
                        <div className="bg-white rounded-tl-[6px] transition-colors group-hover:bg-[#a8d5ff]" />
                        <div className="bg-white rounded-tr-[6px]" />
                        <div className="bg-white rounded-bl-[6px]" />
                        <div className="rounded-br-[6px]" style={{ backgroundColor: "#00d4aa" }} />
                    </div>
                </a>

                <nav className="hidden lg:flex items-center gap-8 text-[15px] font-medium text-neutral-400">
                    <a href="#how" className="hover:text-white transition-colors">
                        How it works
                    </a>
                    <a href="#cases" className="hover:text-white transition-colors">
                        Cases study
                    </a>
                    <a href="#resource" className="hover:text-white transition-colors">
                        Resource
                    </a>
                    <a href="#docs" className="hover:text-white transition-colors">
                        Docs
                    </a>
                    <a href="#support" className="hover:text-white transition-colors">
                        Support
                    </a>
                    <a href="#about" className="hover:text-white transition-colors">
                        About
                    </a>
                </nav>
            </div>

            <div className="flex items-center gap-8">
                <Link
                    href="/auth/sign-in"
                    className="text-[15px] font-medium text-neutral-400 hover:text-white transition-colors hidden md:block"
                >
                    Sign In
                </Link>
                <Link
                    href="/auth/sign-in"
                    className="px-6 py-2.5 rounded-[10px] border border-neutral-700 text-white text-[15px] font-medium hover:border-white transition-colors flex items-center gap-2 group"
                >
                    Try now its free
                    <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>
        </header>
    );
}

export default LandingNavbar
