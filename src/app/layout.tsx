import type { Metadata } from "next";
import { Pixelify_Sans, Jersey_10, Space_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ScrollTop } from "@/components/ScrollTop";
import { PixelConfetti } from "@/components/PixelConfetti";
import { PullToRefresh } from "@/components/PullToRefresh";
import { pickTheme } from "@/lib/theme";

// Pixel face — chrome accents (logo, badges, kickers, nav).
const pixel = Pixelify_Sans({
  variable: "--font-pixelify",
  subsets: ["latin"],
  display: "swap",
});

// Headline face — Jersey 10, a clean condensed pixel face. More legible than
// Pixelify at reading sizes while still on-vibe. Single weight (400).
const jersey = Jersey_10({
  variable: "--font-jersey",
  weight: "400",
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
      data-auto-theme={theme}
      className={`${pixel.variable} ${jersey.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        {/*
          Apply a saved manual theme override before first paint, so a user who
          flipped the toggle doesn't see a flash of the geo-picked theme. Kept
          tiny + synchronous in <head>. data-auto-theme retains the geo pick so
          the toggle's "reset to auto" works.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('designator-theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;}}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col text-ink">
        <PixelConfetti />
        <PullToRefresh />
        <Navigation />
        <main className="flex-1">{children}</main>
        <Footer />
        <ScrollTop />
      </body>
    </html>
  );
}
