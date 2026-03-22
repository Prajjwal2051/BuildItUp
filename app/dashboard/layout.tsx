import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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
            <DashboardSidebar initialPlaygroundData={formattedPlaygroundData || []} />
            <SidebarInset className="min-h-svh overflow-x-hidden">
                <Toaster />
                {children}
            </SidebarInset>
        </SidebarProvider>
    );
}
