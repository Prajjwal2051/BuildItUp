import React from 'react'
import AddNewButton from '@/modules/dashboard/components/add-new-button'
import AddRepoButton from '@/modules/dashboard/components/add-new-repo'
import EmptyState from '@/modules/dashboard/components/empty-state'
import { getAllPlaygroundForUser } from '@/modules/dashboard/actions'
import ProjectTable from '@/modules/dashboard/components/project-table'
import ProjectSearch from '@/modules/dashboard/components/project-search'
import LogoutButton from '@/modules/auth/components/logout-button'
import { currentUser } from '@/modules/auth/actions'
import { MouseGlow } from '@/components/ui/mouse-glow'
import { Activity, Clock3, FolderCode, Sparkles, Star } from 'lucide-react'
import { MotionCard, ScrollReveal } from '@/components/animations/scroll-effects'

const Page = async () => {
    const playgrounds = await getAllPlaygroundForUser()
    const user = await currentUser()
    const totalProjects = playgrounds?.length ?? 0
    const starredProjects =
        playgrounds?.filter((project) => project.starMark?.[0]?.isMarked).length ?? 0
    const activeTemplates = new Set((playgrounds ?? []).map((project) => project.template)).size
    const describedProjects =
        playgrounds?.filter((project) => project.description?.trim().length).length ?? 0

    const dashboardStats = [
        {
            label: 'Playgrounds',
            value: totalProjects,
            note: 'Total editable spaces in your workspace',
            icon: FolderCode,
        },
        {
            label: 'Starred',
            value: starredProjects,
            note: 'Pinned projects you want close at hand',
            icon: Star,
        },
        {
            label: 'Templates',
            value: activeTemplates,
            note: 'Distinct stacks currently in rotation',
            icon: Sparkles,
        },
        {
            label: 'Detailed',
            value: describedProjects,
            note: 'Projects with descriptions and clearer handoff context',
            icon: Activity,
        },
    ]

    const recentTitles = (playgrounds ?? []).slice(0, 3).map((project) => project.title)

    return (
        <div className="relative flex min-h-screen w-full flex-col gap-6 px-8 py-6 md:px-6 lg:px-8">
            <MouseGlow />
            <ScrollReveal y={24}>
                <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
                    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_28px_100px_rgba(0,0,0,0.22)]">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-[12px] text-neutral-300">
                            <Sparkles className="h-4 w-4 text-[#00d4aa]" />
                            Workspace overview
                        </div>
                        <div className="mt-5 flex flex-col gap-5">
                            <div>
                                <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                                    {`Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}.`}
                                </h1>
                                <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-400 md:text-[15px]">
                                    Search projects, jump into a recent build, or spin up a new
                                    playground with a calmer command-center flow.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-black/12 px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
                                <ProjectSearch projects={playgrounds || []} className="flex-1" />
                                <div className="flex shrink-0 items-center gap-3">
                                    <AddNewButton />
                                    <AddRepoButton />
                                </div>
                            </div>
                        </div>
                    </div>

                    <MotionCard className="rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)]">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.18em] text-[#00d4aa]">
                                    Current rhythm
                                </p>
                                <h2 className="mt-2 text-xl font-semibold text-white">
                                    Command center snapshot
                                </h2>
                            </div>
                            <Clock3 className="h-5 w-5 text-[#00d4aa]" />
                        </div>
                        <div className="mt-5 space-y-3">
                            {recentTitles.length > 0 ? (
                                recentTitles.map((title, index) => (
                                    <div
                                        key={title}
                                        className="rounded-2xl border border-white/8 bg-black/12 px-4 py-3"
                                    >
                                        <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                                            Recent slot {index + 1}
                                        </p>
                                        <p className="mt-2 text-sm font-medium text-white">{title}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-8 text-center text-sm text-neutral-500">
                                    Create your first playground to start building momentum here.
                                </div>
                            )}
                        </div>
                    </MotionCard>
                </section>
            </ScrollReveal>

            <ScrollReveal y={34}>
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {dashboardStats.map((stat, index) => {
                        const Icon = stat.icon
                        return (
                            <MotionCard
                                key={stat.label}
                                delay={0.06 * index}
                                className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-[12px] uppercase tracking-[0.18em] text-neutral-500">
                                        {stat.label}
                                    </p>
                                    <div className="rounded-xl border border-[#00d4aa]/20 bg-[#00d4aa]/8 p-2">
                                        <Icon className="h-4 w-4 text-[#00d4aa]" />
                                    </div>
                                </div>
                                <p className="mt-5 text-3xl font-semibold tracking-tight text-white">
                                    {stat.value}
                                </p>
                                <p className="mt-2 text-sm leading-6 text-neutral-400">
                                    {stat.note}
                                </p>
                            </MotionCard>
                        )
                    })}
                </section>
            </ScrollReveal>

            <ScrollReveal y={40} scrub>
                {playgrounds && playgrounds.length === 0 ? (
                    <EmptyState />
                ) : (
                    <ProjectTable
                        projects={playgrounds || []}
                        currentUserName={user?.name || 'Unknown User'}
                        currentUserImage={user?.image || null}
                    />
                )}
            </ScrollReveal>

            <LogoutButton className="fixed right-6 bottom-6 z-50 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/90 px-3 py-2 text-sm font-medium text-foreground shadow-lg backdrop-blur-md transition-colors hover:bg-background">
                Logout
            </LogoutButton>
        </div>
    )
}

export default Page
