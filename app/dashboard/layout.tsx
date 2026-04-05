import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { getAllPlaygroundForUser } from '@/modules/dashboard/actions'
import { DashboardSidebar } from '@/modules/dashboard/components/dashboard-sidebar'
import { Toaster } from '@/components/ui/sonner'

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
    const formattedPlaygroundData = playgrundData?.map((item) => ({
        id: item.id,
        name: item.title,
        icon: technologyIconMap[item.template] || 'Code2', // Default icon if template is not in the map
        starred: item.starMark?.[0]?.isMarked ?? false,
    }))

    return (
        <SidebarProvider>
            <DashboardSidebar initialPlaygroundData={formattedPlaygroundData || []} />
            <SidebarInset className="min-h-svh overflow-x-hidden">
                <Toaster />
                {children}
            </SidebarInset>
        </SidebarProvider>
    )
}

export default DashboardLayout
