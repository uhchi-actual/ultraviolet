import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { AppShell } from "@/components/AppShell";
import { Navbar } from "@/components/nav/Navbar";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ultraviolet — Music Recommendation Engine",
  description:
    "Multi-agent, content-based music recommendation engine with an explainable Tree.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <Navbar />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
