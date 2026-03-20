import type { Metadata } from "next";
import "./globals.css";
import {SessionProvider} from "next-auth/react";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Build It Up - AI Code Editor",
  description: "Build, Learn, Deploy with AI-assisted code development.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const session=await auth()
  return (
      <SessionProvider session={session}>

    <html lang="en" className="scroll-smooth">
      <body className="antialiased">
        {children}
      </body>
    </html>
      </SessionProvider>
  );
}
