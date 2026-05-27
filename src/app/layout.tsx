import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { pickTheme } from "@/lib/theme";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DesignPulse — Your daily design briefing",
  description:
    "A daily magazine for product designers. Curated updates from Figma, NNGroup, UX Collective, Lenny's, The Verge, and 70+ trusted sources — summarized so you stay current in under 5 minutes.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Pick theme server-side using Vercel's edge-injected geo headers so the
  // HTML lands pre-themed (no client flash, no localStorage).
  const h = await headers();
  const lat = parseFloat(h.get("x-vercel-ip-latitude") ?? "");
  const lng = parseFloat(h.get("x-vercel-ip-longitude") ?? "");
  const theme = pickTheme(
    Number.isFinite(lat) ? lat : null,
    Number.isFinite(lng) ? lng : null
  );

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${manrope.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <Navigation />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
