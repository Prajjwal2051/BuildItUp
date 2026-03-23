import { AtSign, BarChart2, Box, Shapes, Zap } from "lucide-react";

// Shows social proof logos to build trust before users try the editor demo.
function TrustedCompanies() {
    return (
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
                    <span className="w-6 h-6 border-2 border-neutral-300 rounded-full flex items-center justify-center text-xs">
                        U
                    </span>
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
    );
}

export default TrustedCompanies
