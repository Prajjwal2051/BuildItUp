'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Code2,
    Compass,
    FolderPlus,
    History,
    Home,
    LayoutDashboard,
    Lightbulb,
    type LucideIcon,
    Plus,
    Star,
    Terminal,
    Zap,
    Database,
    FlameIcon,
} from 'lucide-react'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarGroupAction,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from '@/components/ui/sidebar'
import { Audiowide } from 'next/font/google'
import type React from 'react'

const audiowide = Audiowide({
    subsets: ['latin'],
    weight: '400',
})

// Define the interface for a single playground item, icon is now a string
interface PlaygroundData {
    id: string
    name: string
    icon: string // Changed to string
    starred: boolean
}

// Map icon names (strings) to their corresponding LucideIcon components
const lucideIconMap: Record<string, LucideIcon> = {
    Zap: Zap,
    Lightbulb: Lightbulb,
    Database: Database,
    Compass: Compass,
    FlameIcon: FlameIcon,
    Terminal: Terminal,
    Code2: Code2, // Include the default icon
    // Add any other icons you might use dynamically
}

function DashboardSidebar({ initialPlaygroundData }: { initialPlaygroundData: PlaygroundData[] }) {
    const pathname = usePathname()
    const [starredPlaygrounds] = useState(initialPlaygroundData.filter((p) => p.starred))
    const [recentPlaygrounds] = useState(initialPlaygroundData)

    return (
        <Sidebar
            variant="sidebar"
            collapsible="none"
            className="h-svh min-h-svh border border-r border-white/6 bg-[#0d1015]/60 text-white backdrop-blur-xl"
            style={
                {
                    '--sidebar': '#ffff',
                    '--sidebar-foreground': '#f8fafc',
                    '--sidebar-primary': '#00d4aa',
                    '--sidebar-primary-foreground': '#03120f',
                    '--sidebar-accent': 'rgba(0,212,170,0.10)',
                    '--sidebar-accent-foreground': '#f8fafc',
                    '--sidebar-border': 'rgba(255,255,255,0.08)',
                    '--sidebar-ring': 'rgba(0,212,170,0.35)',
                } as React.CSSProperties
            }
        >
            <SidebarHeader className="border-b border-white/6 px-2 pb-4 pt-3">
                <div className="flex items-center gap-3 rounded-2xl border border-white/6 bg-[rgba(255,255,255,0.02)] px-3 py-3">
                    <div className="grid h-9 w-9 grid-cols-2 gap-0.5 rounded-xl bg-[rgba(255,255,255,0.03)] p-1.5">
                        <div className="rounded-sm bg-white" />
                        <div className="rounded-sm bg-white" />
                        <div className="rounded-sm bg-white" />
                        <div className="rounded-sm bg-[#00d4aa]" />
                    </div>
                    <div className="flex min-w-0 flex-col">
                        <span className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                            Orbit Code
                        </span>
                        <span
                            className={`${audiowide.className} block truncate text-sm tracking-wide text-white`}
                        >
                            Dashboard
                        </span>
                    </div>
                </div>
            </SidebarHeader>
            <SidebarContent className="px-1 py-2">
                <SidebarGroup className="px-2">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname === '/'}
                                tooltip="Home"
                                className="rounded-xl text-neutral-300 hover:text-white data-[active=true]:bg-[rgba(0,212,170,0.12)] data-[active=true]:text-white data-[active=true]:shadow-[0_0_0_1px_rgba(0,212,170,0.12)]"
                            >
                                <Link href="/">
                                    <Home className="h-4 w-4" />
                                    <span>Home</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname === '/dashboard'}
                                tooltip="Dashboard"
                                className="rounded-xl text-neutral-300 hover:text-white data-[active=true]:bg-[rgba(0,212,170,0.12)] data-[active=true]:text-white data-[active=true]:shadow-[0_0_0_1px_rgba(0,212,170,0.12)]"
                            >
                                <Link href="/dashboard">
                                    <LayoutDashboard className="h-4 w-4" />
                                    <span>Dashboard</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>

                <SidebarGroup className="px-2 pt-4">
                    <SidebarGroupLabel className="text-[11px] uppercase tracking-[0.18em] text-[#00d4aa]">
                        <Star className="h-4 w-4 mr-2" />
                        Starred
                    </SidebarGroupLabel>
                    <SidebarGroupAction
                        title="Add starred playground"
                        className="text-neutral-500 hover:bg-[rgba(0,212,170,0.08)] hover:text-white"
                    >
                        <Plus className="h-4 w-4" />
                    </SidebarGroupAction>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {starredPlaygrounds.length === 0 ? (
                                <div className="w-full py-4 text-center text-sm text-neutral-500">
                                    No starred playgrounds yet
                                </div>
                            ) : (
                                starredPlaygrounds.map((playground) => {
                                    const IconComponent = lucideIconMap[playground.icon] || Code2
                                    return (
                                        <SidebarMenuItem key={playground.id}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={
                                                    pathname === `/playground/${playground.id}`
                                                }
                                                tooltip={playground.name}
                                                className="rounded-xl text-neutral-300 hover:text-white data-[active=true]:bg-[rgba(0,212,170,0.12)] data-[active=true]:text-white data-[active=true]:shadow-[0_0_0_1px_rgba(0,212,170,0.12)]"
                                            >
                                                <Link href={`/playground/${playground.id}`}>
                                                    {IconComponent && (
                                                        <IconComponent className="h-4 w-4" />
                                                    )}
                                                    <span>{playground.name}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )
                                })
                            )}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup className="px-2 pt-4">
                    <SidebarGroupLabel className="text-[11px] uppercase tracking-[0.18em] text-[#00d4aa]">
                        <History className="h-4 w-4 mr-2" />
                        Recent
                    </SidebarGroupLabel>
                    <SidebarGroupAction
                        title="Create new playground"
                        className="text-neutral-500 hover:bg-[rgba(0,212,170,0.08)] hover:text-white"
                    >
                        <FolderPlus className="h-4 w-4" />
                    </SidebarGroupAction>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {starredPlaygrounds.length === 0 && recentPlaygrounds.length === 0
                                ? null
                                : recentPlaygrounds.map((playground) => {
                                    const IconComponent = lucideIconMap[playground.icon] || Code2
                                    return (
                                        <SidebarMenuItem key={playground.id}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={
                                                    pathname === `/playground/${playground.id}`
                                                }
                                                tooltip={playground.name}
                                                className="rounded-xl text-neutral-300 hover:text-white data-[active=true]:bg-[rgba(0,212,170,0.12)] data-[active=true]:text-white data-[active=true]:shadow-[0_0_0_1px_rgba(0,212,170,0.12)]"
                                            >
                                                <Link href={`/playground/${playground.id}`}>
                                                    {IconComponent && (
                                                        <IconComponent className="h-4 w-4" />
                                                    )}
                                                    <span>{playground.name}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )
                                })}

                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="mt-auto border-t border-white/6 px-4 py-4">
                <div className="w-full rounded-2xl border border-white/6 bg-[rgba(255,255,255,0.02)] px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                        Workspace
                    </p>
                    <p className="mt-1 text-sm font-medium text-white">Ship from orbit</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-500">
                        Teal accents, deep surfaces, and a cleaner command-center feel.
                    </p>
                </div>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}

export { DashboardSidebar }
