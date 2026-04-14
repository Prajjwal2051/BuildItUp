'use client'

// Renders the cinematic space video and glow so the landing page has depth.
export function SpaceBackground() {
    return (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
            {/* Uses the spaceXNew image from public assets as the base background layer. */}
            <img
                src="/assets/satellite.jpg"
                alt="Space background"
                className="absolute inset-0 h-full w-full object-cover"
            />

            {/* Soft gradient prevents bright frames from reducing text contrast. */}
            <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/20" />

            {/* Darkens the frame edges so foreground content stays focused and readable. */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.38) 72%, rgba(0,0,0,0.82) 100%)',
                }}
            />
        </div>
    )
}
