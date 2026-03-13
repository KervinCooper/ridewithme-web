import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import PWAUpdater from "./PWAUpdater";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "onthemuv | Transit",
  description: "Secure real-time student tracking.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "onthemuv",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-[#050505]">
      <body className={`${geistSans.variable} antialiased bg-[#050505] text-white`}>
        <PWAUpdater /> {/* Add this line */}
        {children}
        <Analytics />
      </body>
    </html>
  );
}