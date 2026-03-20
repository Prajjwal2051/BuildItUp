import LandingNavbar from "@/modules/home/components/landing-navbar";
import NotificationBanner from "@/modules/home/components/notification-banner";

// Combines top navigation and announcement banner for the landing page.
export default function HomeHeader() {
    return (
        <>
            <LandingNavbar />
            <NotificationBanner />
        </>
    );
}
