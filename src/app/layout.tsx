import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Press_Start_2P, Syne } from "next/font/google";
import AppHeader from "@/components/AppHeader";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-syne",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

const pressStart2P = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "Interior Analyzer | Vitruvi AI",
  description: "AI-powered interior measurement and design tool for architects",
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${ibmPlexMono.variable} ${pressStart2P.variable}`}
    >
      <body style={{ fontFamily: "var(--font-mono)" }}>
        <AppHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}
