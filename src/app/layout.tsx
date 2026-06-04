import type { Metadata } from "next";
import { Pixelify_Sans, Space_Grotesk, Space_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { pickTheme } from "@/lib/theme";

// Pixel face — chrome ONLY (logo, badges, kickers, nav). Never headlines:
// it hurts comprehension at reading sizes.
const pixel = Pixelify_Sans({
  variable: "--font-pixelify",
  subsets: ["latin"],
  display: "swap",
});

// Headline face — clean + characterful, the sibling of Space Mono so the
// trio (pixel / grotesk / mono) reads as one intentional system.
const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  display: "swap",
});

// Reading layer — summaries, metadata, body copy.
const mono = Space_Mono({
  variable: "--font-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Designator · Your daily design briefing",
  description:
    "A daily briefing for product designers. Curated updates from Figma, NN/g, UX Collective, Lenny's, The Verge, and 70+ trusted sources, summarized so you stay current in under five minutes.",
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
      className={`${pixel.variable} ${grotesk.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <Navigation />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
