import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Libre_Baskerville } from "next/font/google";
import SiteNav from "@/components/SiteNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const libre = Libre_Baskerville({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-libre",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Guitar → Strings Arranger",
  description:
    "Turn guitar tab or sheet photos into violin, cello, ukulele, mandolin, and more — with readable tab, performance mode, and a secure Gemini API proxy.",
  appleWebApp: {
    capable: true,
    title: "String Arranger",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#5c3d2e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${libre.variable} h-full`}
    >
      <body className="flex min-h-full flex-col font-sans antialiased">
        <SiteNav />
        <main className="relative flex-1">{children}</main>
      </body>
    </html>
  );
}
