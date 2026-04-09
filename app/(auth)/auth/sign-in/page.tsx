import { ArrowRight, Users, Workflow } from 'lucide-react'
import SignInFormClient from '@/modules/auth/components/sign-in-form-client'

// Shows a branded sign-in view that matches the landing page style.
function Page() {
    const highlights = [
        {
            Icon: Users,
            title: 'Multiplayer coding',
            description: 'Invite teammates into the same workspace and ship together in real time.',
        },
        {
            Icon: Workflow,
            title: 'Cloud execution',
            description: 'Run, test, and debug instantly without local environment setup friction.',
        },
    ]

    return (
        <section className="w-full max-w-[68rem] px-2">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.88fr] gap-5 xl:gap-6 items-stretch">
                <div
                    className="auth-panel-left auth-panel-hover relative overflow-hidden rounded-[2rem] border p-5 md:p-6 lg:p-7"
                    style={{
                        borderColor: '#1e2028',
                        background:
                            'linear-gradient(180deg, rgba(15,20,24,0.9) 0%, rgba(10,13,18,0.92) 100%)',
                        boxShadow:
                            'inset 0 1px 0 rgba(255,255,255,0.03), 0 24px 80px rgba(0,0,0,0.35)',
                    }}
                >
                    <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                            background:
                                'radial-gradient(circle at 20% 15%, rgba(0,212,170,0.12), transparent 30%), radial-gradient(circle at 80% 85%, rgba(0,94,123,0.16), transparent 32%)',
                        }}
                    />

                    <div className="relative">
                        <p
                            className="auth-stagger auth-stagger-1 mb-4 text-[11px] uppercase tracking-[0.28em] font-medium"
                            style={{ color: '#00d4aa' }}
                        >
                            Welcome to Orbit Code
                        </p>
                        <h1 className="auth-stagger auth-stagger-2 max-w-xl text-[2rem] md:text-[2.5rem] lg:text-[3rem] font-semibold text-white leading-[1.02] tracking-tight mb-3">
                            Sign in and launch your workspace in seconds
                        </h1>
                        <p className="auth-stagger auth-stagger-3 max-w-xl text-[14px] md:text-[15px] text-neutral-400 leading-6.5 mb-5">
                            Continue with Google or GitHub to enter a collaborative IDE built for
                            fast teams, shared sessions, and browser-native development.
                        </p>

                        <div className="space-y-3 mb-5">
                            {highlights.map(({ Icon, title, description }) => (
                                <div
                                    key={title}
                                    className="auth-stagger auth-highlight-card flex items-start gap-3 rounded-2xl border p-3"
                                    style={{
                                        borderColor: 'rgba(255,255,255,0.06)',
                                        backgroundColor: 'rgba(255,255,255,0.02)',
                                    }}
                                >
                                    <div
                                        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                                        style={{ backgroundColor: 'rgba(0,212,170,0.1)' }}
                                    >
                                        <Icon className="h-4.5 w-4.5" style={{ color: '#00d4aa' }} />
                                    </div>
                                    <div>
                                        <h2 className="text-[15px] font-semibold text-white mb-1">
                                            {title}
                                        </h2>
                                        <p className="text-[13px] text-neutral-500 leading-5">
                                            {description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div
                            className="auth-stagger auth-stagger-4 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] text-neutral-300"
                            style={{
                                borderColor: 'rgba(255,255,255,0.08)',
                                backgroundColor: 'rgba(255,255,255,0.03)',
                            }}
                        >
                            <span className="h-2 w-2 rounded-full bg-[#00d4aa]" />
                            Real-time sessions ready
                            <ArrowRight className="h-3.5 w-3.5 text-[#00d4aa]" />
                        </div>
                    </div>
                </div>

                <div
                    className="auth-panel-right auth-panel-hover relative overflow-hidden rounded-[2rem] border p-1"
                    style={{
                        borderColor: '#1e2028',
                        background:
                            'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                        boxShadow:
                            'inset 0 1px 0 rgba(255,255,255,0.04), 0 24px 80px rgba(0,0,0,0.35)',
                    }}
                >
                    <div
                        className="pointer-events-none absolute inset-x-6 top-0 h-40 blur-3xl"
                        style={{
                            background:
                                'radial-gradient(circle at center, rgba(0,212,170,0.12), transparent 70%)',
                        }}
                    />
                    <div
                        className="relative h-full rounded-[calc(2rem-4px)] px-3 py-3 md:px-4 md:py-4"
                        style={{ backgroundColor: 'rgba(10,13,18,0.88)' }}
                    >
                        <SignInFormClient />
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Page
