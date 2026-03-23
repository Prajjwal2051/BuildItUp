import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Orbit Code - AI Code Editor",
  description: "Build, Learn, Deploy with AI-assisted code development.",
};

async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const session = await auth()
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <SessionProvider session={session}>
        <body className="antialiased">
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            {children}
          </ThemeProvider>
        </body>
      </SessionProvider>
    </html>
  );
}

export default RootLayout
