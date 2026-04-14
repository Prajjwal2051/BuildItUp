'use client'

import { useState, useEffect } from 'react'

const phrases = [
    'Build together with Docker-isolated sandboxes and this AI-driven completions, and zero-latency syncing.',
    'The cloud-based collaborative IDE for real-time development. Code, run, and debug together from any browser.',
]

export function TypewriterText() {
    const [text, setText] = useState('')
    const [phraseIndex, setPhraseIndex] = useState(0)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        const currentPhrase = phrases[phraseIndex]

        let typingSpeed = 50

        if (isDeleting) {
            typingSpeed = 25
        }

        if (!isDeleting && text === currentPhrase) {
            typingSpeed = 2000 // Pause before deleting
            const timeout = setTimeout(() => setIsDeleting(true), typingSpeed)
            return () => clearTimeout(timeout)
        } else if (isDeleting && text === '') {
            typingSpeed = 500 // Pause before typing next phrase
            const timeout = setTimeout(() => {
                setIsDeleting(false)
                setPhraseIndex((prev) => (prev + 1) % phrases.length)
            }, typingSpeed)
            return () => clearTimeout(timeout)
        }

        const timeout = setTimeout(() => {
            setText(currentPhrase.substring(0, text.length + (isDeleting ? -1 : 1)))
        }, typingSpeed)

        return () => clearTimeout(timeout)
    }, [text, isDeleting, phraseIndex])

    return (
        <span className="inline-block relative min-h-[4.5rem] md:min-h-[3.5rem] text-[17px] leading-[1.7] max-w-xl mx-auto w-full">
            {text}
            <span className="animate-pulse border-r-[3px] border-neutral-400 ml-1 inline-block h-[1.1em] align-middle -mt-1"></span>
        </span>
    )
}
