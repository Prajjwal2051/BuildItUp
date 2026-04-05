import Image from 'next/image'
import SignInFormClient from '@/modules/auth/components/sign-in-form-client'

// Shows a branded sign-in view that matches the landing page style.
function Page() {
    return (
        <section className=" items-center gap-6 pb-8 pt-6 md:py-10 lg:grid-cols-2">
            <div className="order-2 lg:order-1 rounded-2xl border border-neutral-800 bg-neutral-950/80 p-8 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-neutral-500 mb-4">
                    Welcome to Orbit Code
                </p>
                <h1 className="text-4xl md:text-5xl font-semibold text-white leading-tight mb-4">
                    Sign in and start coding together
                </h1>
                <p className="text-neutral-400 leading-7 mb-8">
                    Continue with Google or GitHub to access your collaborative workspace, live
                    editor sessions, and version history.
                </p>
                <SignInFormClient />
            </div>

            <div className="order-1 lg:order-2 flex justify-center"></div>
        </section>
    )
}

export default Page
