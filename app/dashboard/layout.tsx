import { SidebarProvider } from "@/components/ui/sidebar";
import { getAllPlaygroundForUser } from "@/modules/dashboard/actions"
import { DashboardSidebar } from "@/modules/dashboard/components/dashboard-sidebar";
import { Toaster } from "@/components/ui/sonner";

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
        name: item.title,
        icon: technologyIconMap[item.template] || "Code2", // Default icon if template is not in the map
        // here we will implement a star marking system, where if the user has marked a playground as favorite, we will show a filled star icon, otherwise an outlined star icon. This will be based on the isMarked property from the Starmark relation.
        starred: false
    }));


    return (


        <SidebarProvider>
            <div className="flex h-screen w-full  overflow-x-hidden">
                <main className="flex-1">
                    <DashboardSidebar initialPlaygroundData={formattedPlaygroundData || []} />
                    <div className="flex flex-col min-h-screen">
                        <Toaster/>
                        <div className="flex-1">
                            {children}
                        </div>
                    </div>

                </main>
            </div>
        </SidebarProvider>
    );
}
