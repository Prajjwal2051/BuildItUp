import Link from "next/link"

export function ExpiredLinkPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0d12] p-4 text-center">
            <div className="w-full max-w-md rounded-xl border border-[#1e2028] bg-[#0c1117] p-8 shadow-2xl">
                <div className="mb-6 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                        <svg
                            className="h-8 w-8 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                </div>
                <h1 className="mb-2 text-2xl font-bold text-white">Link Expired or Invalid</h1>
                <p className="mb-8 text-sm text-[#8ea5b5]">
                    The shared playground link you are trying to access is no longer valid, has been revoked, or has expired.
                </p>
                <Link
                    href="/dashboard"
                    className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#00d4aa] px-4 py-2 text-sm font-semibold text-[#080e13] transition-colors hover:bg-[#00b390] focus:outline-none focus:ring-2 focus:ring-[#00d4aa] focus:ring-offset-2 focus:ring-offset-[#0a0d12]"
                >
                    Return to Dashboard
                </Link>
            </div>
        </div>
    )
}
