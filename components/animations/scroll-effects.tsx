'use client'

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { cn } from '@/lib/utils'

let pluginsRegistered = false

if (typeof window !== 'undefined' && !pluginsRegistered) {
    gsap.registerPlugin(ScrollTrigger)
    pluginsRegistered = true
}

interface ScrollRevealProps {
    children: ReactNode
    className?: string
    delay?: number
    duration?: number
    y?: number
    scrub?: boolean
}

export function ScrollReveal({
    children,
    className,
    delay = 0,
    duration = 0.95,
    y = 48,
    scrub = false,
}: ScrollRevealProps) {
    const ref = useRef<HTMLDivElement>(null)
    const prefersReducedMotion = useReducedMotion()

    useEffect(() => {
        if (prefersReducedMotion || !ref.current) return

        const element = ref.current
        const ctx = gsap.context(() => {
            gsap.fromTo(
                element,
                { autoAlpha: 0, y, scale: 0.985 },
                {
                    autoAlpha: 1,
                    y: 0,
                    scale: 1,
                    delay,
                    duration,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: element,
                        start: 'top 84%',
                        end: scrub ? 'bottom 48%' : undefined,
                        scrub: scrub ? 0.9 : false,
                        once: !scrub,
                    },
                },
            )

            const parallaxNodes = element.querySelectorAll<HTMLElement>('[data-parallax]')
            parallaxNodes.forEach((node, index) => {
                const depth = Number(node.dataset.parallax || 1)
                gsap.fromTo(
                    node,
                    { yPercent: 12 * depth },
                    {
                        yPercent: -12 * depth,
                        ease: 'none',
                        scrollTrigger: {
                            trigger: element,
                            start: 'top bottom',
                            end: 'bottom top',
                            scrub: 1.1 + index * 0.12,
                        },
                    },
                )
            })
        }, ref)

        return () => ctx.revert()
    }, [delay, duration, prefersReducedMotion, scrub, y])

    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    )
}

interface MotionCardProps {
    children: ReactNode
    className?: string
    delay?: number
}

export function MotionCard({ children, className, delay = 0 }: MotionCardProps) {
    const prefersReducedMotion = useReducedMotion()

    return (
        <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 26 }}
            whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{
                duration: 0.55,
                delay,
                ease: [0.16, 1, 0.3, 1],
            }}
            whileHover={
                prefersReducedMotion
                    ? undefined
                    : {
                          y: -8,
                          scale: 1.01,
                          transition: { duration: 0.24, ease: 'easeOut' },
                      }
            }
            className={className}
        >
            {children}
        </motion.div>
    )
}

export function FloatingOrbs({ className }: { className?: string }) {
    const prefersReducedMotion = useReducedMotion()
    const orbs = [
        {
            className:
                'left-[6%] top-24 h-34 w-34 md:left-[10%] md:h-44 md:w-44 bg-[radial-gradient(circle,rgba(0,212,170,0.25),rgba(0,212,170,0))]',
            duration: 9,
            delay: 0,
        },
        {
            className:
                'right-[8%] top-52 h-42 w-42 md:right-[12%] md:h-60 md:w-60 bg-[radial-gradient(circle,rgba(123,180,255,0.18),rgba(123,180,255,0))]',
            duration: 11,
            delay: 0.6,
        },
        {
            className:
                'left-[30%] bottom-10 h-28 w-28 md:left-[42%] md:h-36 md:w-36 bg-[radial-gradient(circle,rgba(255,255,255,0.12),rgba(255,255,255,0))]',
            duration: 8.5,
            delay: 1.1,
        },
    ]

    return (
        <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
            {orbs.map((orb) => (
                <motion.div
                    key={orb.className}
                    className={cn('absolute rounded-full blur-3xl', orb.className)}
                    animate={
                        prefersReducedMotion
                            ? undefined
                            : {
                                  y: [0, -18, 0],
                                  x: [0, 12, 0],
                                  scale: [1, 1.08, 1],
                                  opacity: [0.5, 0.9, 0.5],
                              }
                    }
                    transition={{
                        duration: orb.duration,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: orb.delay,
                    }}
                />
            ))}
        </div>
    )
}
