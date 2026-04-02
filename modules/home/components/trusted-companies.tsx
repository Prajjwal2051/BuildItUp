const companies = [
    { name: "Vercel", icon: "▲" },
    { name: "Stripe", icon: "⬡" },
    { name: "Linear", icon: "◈" },
    { name: "Netlify", icon: "◎" },
    { name: "Railway", icon: "⬡" },
    { name: "Supabase", icon: "◉" },
];

export default function TrustedCompanies() {
    return (
        <section className="w-full py-16 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="max-w-[1240px] mx-auto px-6 md:px-10">
                <p className="text-center text-[11px] font-medium tracking-[0.2em] uppercase text-neutral-600 mb-8">
                    Trusted by developers at
                </p>
                <div className="flex items-center justify-center gap-10 md:gap-16 flex-wrap">
                    {companies.map(({ name, icon }) => (
                        <span key={name}
                            className="flex items-center gap-2 text-[13px] font-semibold text-neutral-700 hover:text-neutral-400 transition-colors cursor-default select-none">
                            <span className="text-[15px]">{icon}</span>
                            {name}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
  }