import { SidebarProvider } from "@/components/ui/sidebar";
import { getAllPlaygroundForUser } from "@/modules/dashboard/actions"
import DashboardSidebar from "@/modules/dashboard/components/dashboard-sidebar";

export default async function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const playgrundData = await getAllPlaygroundForUser();
    const technologyIconMap: Record<string, string> = {
        REACT: "ZAP",
        NEXTJS: "LightBulb",
        EXPRESS: "SERVER",
        VUE: "Compass",
        ANGULAR: "Terminal",
        HONO: "FlameIcon",
    }
    const formattedPlaygroundData = playgrundData?.map((item) => ({
        id: item.id,
        title: item.title,
        icon: technologyIconMap[item.template] || "Code",
        // here we will implement a star marking system, where if the user has marked a playground as favorite, we will show a filled star icon, otherwise an outlined star icon. This will be based on the isMarked property from the Starmark relation.
    }));


    return (


        <SidebarProvider>
            <div className="flex h-screen w-full  overflow-x-hidden">
                <main className="flex-1">
                    <DashboardSidebar playgrounds={formattedPlaygroundData || []} />
                    {children}
                    
                </main>
            </div>
        </SidebarProvider>
    );
}
