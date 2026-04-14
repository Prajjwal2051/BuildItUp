import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { getAllPlaygroundForUser } from '@/modules/dashboard/actions'
import { DashboardSidebar } from '@/modules/dashboard/components/dashboard-sidebar'
import { Toaster } from '@/components/ui/sonner'

type PlaygroundListItem = NonNullable<Awaited<ReturnType<typeof getAllPlaygroundForUser>>>[number]

async function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    const playgrundData = await getAllPlaygroundForUser()
    // This maps template names to sidebar icons so each playground keeps a recognizable visual label.
    const technologyIconMap: Record<string, string> = {
        REACT: 'Zap',
        NEXTJS: 'Lightbulb',
        EXPRESS: 'Database',
        VUE: 'Compass',
        ANGULAR: 'Terminal',
        HONO: 'FlameIcon',
    }
    // Read isMarked from the relation returned by Prisma so Starred sidebar entries are real, not hardcoded.
    const formattedPlaygroundData = playgrundData?.map((item: PlaygroundListItem) => ({
        id: item.id,
        name: item.title,
        icon: technologyIconMap[item.template] || 'Code2', // Default icon if template is not in the map
        starred: item.starMark?.[0]?.isMarked ?? false,
    }))

    return (
        <SidebarProvider>
            <DashboardSidebar initialPlaygroundData={formattedPlaygroundData || []} />
            <SidebarInset className="relative min-h-svh overflow-x-hidden border-xl border-sidebar-border bg-[#0a0d12] text-white">
                <div
                    className="pointer-events-none fixed inset-0 z-0"
                    style={{
                        background: `
      radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,212,170,0.04) 0%, transparent 70%),
      radial-gradient(ellipse 100% 50% at 50% 100%, rgba(0,60,40,0.15) 0%, transparent 60%)
    `,
                    }}
                />
                <div className="pointer-events-none fixed inset-0 z-0 bg-dot-pattern bg-dot-drift opacity-50" />
                <div className="relative z-10">
                    <Toaster />
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}

export default DashboardLayout
