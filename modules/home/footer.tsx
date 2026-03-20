import { Github } from "lucide-react";

// Keeps landing layout extensible with a dedicated footer slot.
export default function HomeFooter() {
    return (
        <footer className="w-full max mx-auto px-6 md:px-10 pb-12 pt-4">
            <div className="mx-auto max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950/70 px-5 py-4 backdrop-blur-sm">
                <div className="flex items-center justify-center gap-3 text-neutral-300">
                    <span className="text-sm tracking-wide">Built by Prajjwal Sahu</span>
                    <a
                        href="https://github.com/Prajjwal2051"
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Prajjwal2051 GitHub profile"
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-700 px-2.5 py-1.5 text-xs text-neutral-300 hover:text-[#00d4aa] hover:border-[#00d4aa]/40 transition-colors"
                    >
                        <Github className="h-3.5 w-3.5" />
                        Prajjwal2051
                    </a>
                </div>
            </div>
        </footer>
    );
}
