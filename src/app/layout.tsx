import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-barlow",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-barlow-condensed",
});

export const metadata: Metadata = {
  title: "HVAC Field Intel",
  description: "Equipment intelligence for HVAC technicians",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HVAC Field Intel",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body className="font-barlow min-h-screen bg-field-bg text-field-text antialiased">
        <main className="content-area">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
